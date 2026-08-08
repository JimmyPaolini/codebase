import fs from "node:fs";
import path from "node:path";

import { buildNameSubstitutions } from "./configuration.utilities.js";

import type {
  CompareMatchedCandidatesArguments,
  ConformetryConfiguration,
  MatchedGeneratorCandidate,
  PreparedValidationDocument,
  ValidationProjectTemplateMetadata,
} from "./configuration.types.js";

/**
 * Shared template-validation helpers extracted from the service class.
 */
export class TemplateValidationOperations {
  /**
   * Replaces template placeholders with generated substitutions.
   */
  public applySubstitutions(
    value: string,
    substitutions: Record<string, string>,
  ): string {
    return value.replaceAll(/__(\w+)__/gu, (match: string, token: string) => {
      const substitutionValue = substitutions[token];
      return substitutionValue === undefined ? match : substitutionValue;
    });
  }

  /**
   * Collects file paths for every template file under a directory.
   */
  public collectTemplateFilePaths(templateDirectoryPath: string): string[] {
    const templateFilePaths: string[] = [];
    const pendingDirectoryPaths: string[] = [templateDirectoryPath];

    while (pendingDirectoryPaths.length > 0) {
      const currentDirectoryPath = pendingDirectoryPaths.pop();
      if (currentDirectoryPath === undefined) {
        continue;
      }

      const directoryEntries = fs.readdirSync(currentDirectoryPath, {
        withFileTypes: true,
      });

      for (const directoryEntry of directoryEntries) {
        const absoluteEntryPath = path.join(
          currentDirectoryPath,
          directoryEntry.name,
        );

        if (directoryEntry.isDirectory()) {
          pendingDirectoryPaths.push(absoluteEntryPath);
          continue;
        }

        if (this.isTemplateFile(directoryEntry.name, directoryEntry.isFile())) {
          templateFilePaths.push(absoluteEntryPath);
        }
      }
    }

    return templateFilePaths.toSorted();
  }

  /**
   * Compares candidate ranking values and selects the better one.
   */
  public compareMatchedCandidates(
    args: CompareMatchedCandidatesArguments,
  ): number {
    const leftGeneratorTagPriority =
      args.projectTemplateMetadata.generatorName ===
      args.leftCandidate.generatorName
        ? 1
        : 0;
    const rightGeneratorTagPriority =
      args.projectTemplateMetadata.generatorName ===
      args.rightCandidate.generatorName
        ? 1
        : 0;

    if (leftGeneratorTagPriority !== rightGeneratorTagPriority) {
      return rightGeneratorTagPriority - leftGeneratorTagPriority;
    }

    const leftPriority = args.inferredGeneratorNames.has(
      args.leftCandidate.generatorName,
    )
      ? 1
      : 0;
    const rightPriority = args.inferredGeneratorNames.has(
      args.rightCandidate.generatorName,
    )
      ? 1
      : 0;

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    if (
      args.leftCandidate.existingFileCount !==
      args.rightCandidate.existingFileCount
    ) {
      return (
        args.rightCandidate.existingFileCount -
        args.leftCandidate.existingFileCount
      );
    }

    return args.leftCandidate.generatorName.localeCompare(
      args.rightCandidate.generatorName,
    );
  }

  /**
   * Counts mapped template files that already exist in the project path.
   */
  public countExistingTemplateMappedFiles(args: {
    absoluteTemplateDirectoryPath: string;
    projectPath: string;
    substitutions: Record<string, string>;
    templateFilePaths: string[];
  }): number {
    let existingFileCount = 0;

    for (const templateFilePath of args.templateFilePaths) {
      const templateRelativePath = path.relative(
        args.absoluteTemplateDirectoryPath,
        templateFilePath,
      );
      const instanceRelativePath = this.applySubstitutions(
        templateRelativePath,
        args.substitutions,
      );
      const instanceFilePath = path.join(args.projectPath, instanceRelativePath);
      if (fs.existsSync(instanceFilePath)) {
        existingFileCount += 1;
      }
    }

    return existingFileCount;
  }

  /**
   * Builds substitutions used to render template paths and content.
   */
  public createTemplateSubstitutions(args: {
    projectPath: string;
    projectTemplateMetadata: ValidationProjectTemplateMetadata;
    workingDirectory: string;
  }): Record<string, string> {
    const projectName = path.basename(args.projectPath);
    const projectNameSubstitutions = buildNameSubstitutions(projectName);
    const projectType = this.resolveProjectType({
      projectPath: args.projectPath,
      projectTemplateMetadata: args.projectTemplateMetadata,
      workingDirectory: args.workingDirectory,
    });

    return {
      description:
        args.projectTemplateMetadata.description ??
        this.resolveProjectDescription(args.projectPath),
      name: projectName,
      nameCamelCase: projectNameSubstitutions["nameCamelCase"] ?? projectName,
      nameKebabCase: projectNameSubstitutions["nameKebabCase"] ?? projectName,
      namePascalCase: projectNameSubstitutions["namePascalCase"] ?? projectName,
      nameSnakeCase: projectNameSubstitutions["nameSnakeCase"] ?? projectName,
      type: projectType,
    };
  }

  /**
   * Determines whether a directory entry should be included as a template file.
   */
  public isTemplateFile(entryName: string, isFile: boolean): boolean {
    if (!isFile) {
      return false;
    }

    return entryName !== "schema.json";
  }

  /**
   * Creates one candidate from generator definition and project mapping.
   */
  public createMatchedGeneratorCandidate(args: {
    configuration: ConformetryConfiguration;
    generatorName: string;
    projectPath: string;
    substitutions: Record<string, string>;
    workingDirectory: string;
  }): MatchedGeneratorCandidate | undefined {
    const generatorDefinition = args.configuration.generators[args.generatorName];
    if (generatorDefinition === undefined) {
      return undefined;
    }

    const absoluteTemplateDirectoryPath = path.resolve(
      args.workingDirectory,
      generatorDefinition.templateDirectoryPath,
    );
    const templateFilePaths = this.collectTemplateFilePaths(
      absoluteTemplateDirectoryPath,
    );
    if (templateFilePaths.length === 0) {
      return undefined;
    }

    const existingFileCount = this.countExistingTemplateMappedFiles({
      absoluteTemplateDirectoryPath,
      projectPath: args.projectPath,
      substitutions: args.substitutions,
      templateFilePaths,
    });

    return {
      absoluteTemplateDirectoryPath,
      existingFileCount,
      generatorName: args.generatorName,
      substitutions: args.substitutions,
      templateFilePaths,
    };
  }

  /**
   * Infers likely generator names from the project directory name.
   */
  public inferGeneratorNamesFromProjectPath(args: {
    configuredGeneratorNames: string[];
    projectPath: string;
  }): Set<string> {
    const projectDirectoryName = path.basename(args.projectPath).toLowerCase();
    const inferredGeneratorNames = args.configuredGeneratorNames.filter(
      (generatorName) =>
        projectDirectoryName.includes(generatorName.toLowerCase()),
    );

    return new Set(inferredGeneratorNames);
  }

  /**
   * Prepares a mapped validation document for a template file.
   */
  public prepareDocumentForTemplateFile(args: {
    extensionSet: Set<string>;
    generatorCandidate: MatchedGeneratorCandidate;
    projectPath: string;
    templateFilePath: string;
    templateRootPath: string;
  }):
    | undefined
    | { document: PreparedValidationDocument }
    | { violation: string } {
    const extension = path.extname(args.templateFilePath);
    if (!args.extensionSet.has(extension)) {
      return undefined;
    }

    const templateRelativePath = path.relative(
      args.templateRootPath,
      args.templateFilePath,
    );
    const instanceRelativePath = this.applySubstitutions(
      templateRelativePath,
      args.generatorCandidate.substitutions,
    );
    const instanceFilePath = path.join(args.projectPath, instanceRelativePath);

    if (!fs.existsSync(instanceFilePath)) {
      return {
        violation: `Missing file ${instanceFilePath} required by template ${args.templateFilePath}`,
      };
    }

    const instanceFileContent = fs.readFileSync(instanceFilePath, "utf8");
    const templateFileContent = fs.readFileSync(args.templateFilePath, "utf8");

    return {
      document: {
        filename: path.basename(instanceFilePath),
        instance: instanceFileContent,
        instanceFilePath,
        renderedTemplate: this.renderTemplateContent(
          templateFileContent,
          args.generatorCandidate.substitutions,
        ),
        templateFilePath: args.templateFilePath,
      },
    };
  }

  /**
   * Prepares documents for one matched generator candidate.
   */
  public prepareDocumentsForGenerator(args: {
    fileExtensions: string[];
    generatorCandidate: MatchedGeneratorCandidate;
    projectPath: string;
  }): {
    documents: PreparedValidationDocument[];
    violations: string[];
  } {
    const absoluteTemplateDirectoryPath =
      args.generatorCandidate.absoluteTemplateDirectoryPath;
    const extensionSet = new Set(args.fileExtensions);
    const documents: PreparedValidationDocument[] = [];
    const violations: string[] = [];

    for (const templateFilePath of args.generatorCandidate.templateFilePaths) {
      const documentPreparation = this.prepareDocumentForTemplateFile({
        extensionSet,
        generatorCandidate: args.generatorCandidate,
        projectPath: args.projectPath,
        templateFilePath,
        templateRootPath: absoluteTemplateDirectoryPath,
      });

      if (documentPreparation === undefined) {
        continue;
      }

      if ("violation" in documentPreparation) {
        violations.push(documentPreparation.violation);
        continue;
      }

      documents.push(documentPreparation.document);
    }

    return {
      documents,
      violations,
    };
  }

  /**
   * Resolves a stable project type for substitution rendering.
   */
  public resolveProjectType(args: {
    projectPath: string;
    projectTemplateMetadata: ValidationProjectTemplateMetadata;
    workingDirectory: string;
  }): string {
    if (args.projectTemplateMetadata.type !== undefined) {
      return args.projectTemplateMetadata.type;
    }

    const relativeProjectPath = path.relative(
      args.workingDirectory,
      args.projectPath,
    );
    const relativePathSegment = relativeProjectPath
      .split(path.sep)
      .map((segment) => segment.trim())
      .find((segment) => segment.length > 0);

    return relativePathSegment ?? "applications";
  }

  /**
   * Resolves project description from pyproject.toml, when present.
   */
  public resolveProjectDescription(projectPath: string): string {
    const pyprojectPath = path.join(projectPath, "pyproject.toml");
    if (!fs.existsSync(pyprojectPath)) {
      return "";
    }

    const pyprojectFileContent = fs.readFileSync(pyprojectPath, "utf8");
    const descriptionMatch =
      /^description\s*=\s*["'](?<description>.*)["']$/mu.exec(
        pyprojectFileContent,
      );

    const description = descriptionMatch?.groups?.["description"];
    return description === undefined ? "" : description;
  }

  private renderTemplateContent(
    templateContent: string,
    substitutions: Record<string, string>,
  ): string {
    return templateContent.replaceAll(
      /\{\{([^{}]+)\}\}/gu,
      (_token, field: string) => {
        return substitutions[field.trim()] ?? _token;
      },
    );
  }
}
