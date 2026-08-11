import fs from "node:fs";
import path from "node:path";

import { buildNameSubstitutions } from "./configuration.utilities";

import type {
  CompareMatchedCandidatesArguments,
  ConformetryConfiguration,
  MatchedGeneratorCandidate,
  PreparedValidationDocument,
  ValidationProjectTemplateMetadata,
} from "./configuration.types";

/**
 * Creates the validation-operation helpers used by template validation.
 */
export function createTemplateValidationOperations(): {
  applySubstitutions: typeof applySubstitutions;
  collectTemplateFilePaths: typeof collectTemplateFilePaths;
  compareMatchedCandidates: typeof compareMatchedCandidates;
  countExistingTemplateMappedFiles: typeof countExistingTemplateMappedFiles;
  createMatchedGeneratorCandidate: typeof createMatchedGeneratorCandidate;
  createTemplateSubstitutions: typeof createTemplateSubstitutions;
  inferGeneratorNamesFromProjectPath: typeof inferGeneratorNamesFromProjectPath;
  isTemplateFile: typeof isTemplateFile;
  prepareDocumentForTemplateFile: typeof prepareDocumentForTemplateFile;
  prepareDocumentsForGenerator: typeof prepareDocumentsForGenerator;
  resolveProjectDescription: typeof resolveProjectDescription;
  resolveProjectType: typeof resolveProjectType;
} {
  return {
    applySubstitutions,
    collectTemplateFilePaths,
    compareMatchedCandidates,
    countExistingTemplateMappedFiles,
    createMatchedGeneratorCandidate,
    createTemplateSubstitutions,
    inferGeneratorNamesFromProjectPath,
    isTemplateFile,
    prepareDocumentForTemplateFile,
    prepareDocumentsForGenerator,
    resolveProjectDescription,
    resolveProjectType,
  };
}

/**
 * Applies template substitutions to the provided value.
 */
function applySubstitutions(
  value: string,
  substitutions: Record<string, string>,
): string {
  return value.replaceAll(/__(\w+)__/gu, (match: string, token: string) => {
    const substitutionValue = substitutions[token];
    return substitutionValue === undefined ? match : substitutionValue;
  });
}

/**
 * Collects all template file paths from a template directory.
 */
function collectTemplateFilePaths(templateDirectoryPath: string): string[] {
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

      const templateRelativePath = path
        .relative(templateDirectoryPath, absoluteEntryPath)
        .replaceAll("\\", "/");

      if (isTemplateFile(templateRelativePath, directoryEntry.isFile())) {
        templateFilePaths.push(absoluteEntryPath);
      }
    }
  }

  return templateFilePaths.toSorted();
}

/**
 * Compares matched generator candidates to determine the best match.
 */
function compareMatchedCandidates(
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
 * Counts the number of template-mapped files that already exist in the project.
 */
function countExistingTemplateMappedFiles(args: {
  absoluteTemplateDirectoryPath: string;
  fileExtensions?: string[];
  projectPath: string;
  substitutions: Record<string, string>;
  templateFilePaths: string[];
}): number {
  const extensionSet =
    args.fileExtensions === undefined
      ? undefined
      : new Set(args.fileExtensions);
  let existingFileCount = 0;

  for (const templateFilePath of args.templateFilePaths) {
    if (
      extensionSet !== undefined &&
      !extensionSet.has(path.extname(templateFilePath))
    ) {
      continue;
    }

    const templateRelativePath = path.relative(
      args.absoluteTemplateDirectoryPath,
      templateFilePath,
    );
    const instanceRelativePath = applySubstitutions(
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
 * Creates a generator-candidate record from the provided template metadata.
 */
function createMatchedGeneratorCandidate(args: {
  configuration: ConformetryConfiguration;
  fileExtensions?: string[];
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
  const templateFilePaths = collectTemplateFilePaths(
    absoluteTemplateDirectoryPath,
  );
  if (templateFilePaths.length === 0) {
    return undefined;
  }

  const existingFileCount = countExistingTemplateMappedFiles({
    absoluteTemplateDirectoryPath,
    ...(args.fileExtensions === undefined
      ? {}
      : { fileExtensions: args.fileExtensions }),
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
 * Creates the common substitutions for a project template.
 */
function createTemplateSubstitutions(args: {
  projectPath: string;
  projectTemplateMetadata: ValidationProjectTemplateMetadata;
  workingDirectory: string;
}): Record<string, string> {
  const projectName = path.basename(args.projectPath);
  const projectNameSubstitutions = buildNameSubstitutions(projectName);
  const projectType = resolveProjectType({
    projectPath: args.projectPath,
    projectTemplateMetadata: args.projectTemplateMetadata,
    workingDirectory: args.workingDirectory,
  });

  return {
    description:
      args.projectTemplateMetadata.description ??
      resolveProjectDescription(args.projectPath),
    name: projectName,
    nameCamelCase: projectNameSubstitutions["nameCamelCase"] ?? projectName,
    nameKebabCase: projectNameSubstitutions["nameKebabCase"] ?? projectName,
    namePascalCase: projectNameSubstitutions["namePascalCase"] ?? projectName,
    nameSnakeCase: projectNameSubstitutions["nameSnakeCase"] ?? projectName,
    type: projectType,
  };
}

/**
 * Infers candidate generator names from the project path.
 */
function inferGeneratorNamesFromProjectPath(args: {
  configuredGeneratorNames: string[];
  projectPath: string;
}): Set<string> {
  const projectDirectoryName = path.basename(args.projectPath).toLowerCase();
  const inferredGeneratorNames = args.configuredGeneratorNames.filter(
    (generatorName) => {
      return projectDirectoryName.includes(generatorName.toLowerCase());
    },
  );

  return new Set(inferredGeneratorNames);
}

/**
 * Determines whether a filesystem entry should be treated as a template file.
 */
function isTemplateFile(
  templateRelativePath: string,
  isFile: boolean,
): boolean {
  return isFile && templateRelativePath.length > 0;
}

/**
 * Prepares a validation document for an individual template file.
 */
function prepareDocumentForTemplateFile(args: {
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
  const instanceRelativePath = applySubstitutions(
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
      renderedTemplate: renderTemplateContent(
        templateFileContent,
        args.generatorCandidate.substitutions,
      ),
      templateFilePath: args.templateFilePath,
    },
  };
}

/**
 * Prepares validation documents for all files in a generator candidate.
 */
function prepareDocumentsForGenerator(args: {
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
    const documentPreparation = prepareDocumentForTemplateFile({
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
 * Renders template content with the provided substitutions.
 */
function renderTemplateContent(
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

/**
 * Resolves the project description from a pyproject file.
 */
function resolveProjectDescription(projectPath: string): string {
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

/**
 * Resolves the project type from metadata or the project path.
 */
function resolveProjectType(args: {
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
