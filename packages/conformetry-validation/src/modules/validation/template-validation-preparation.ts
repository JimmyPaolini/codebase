import fs from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import {
  DefaultTemplateRenderer,
  GenerationRuntimeService,
} from "@jimmypaolini/conformetry-generation";

import type { ConformetryConfiguration } from "@jimmypaolini/conformetry-configuration";
import type {
  PreparedValidationDocument,
  PreparedValidationPayload,
} from "./validation.types.js";

/**
 * Arguments for template-aware validation preparation.
 */
export interface PrepareTemplateValidationPayloadArguments {
  configurationPath: string;
  fileExtensions: string[];
  filePaths: string[];
  templateRuleNames?: string[];
  workingDirectory: string;
}

interface MatchedGeneratorCandidate {
  absoluteTemplateDirectoryPath: string;
  existingFileCount: number;
  generatorName: string;
  substitutions: Record<string, string>;
  templateFilePaths: string[];
}

/**
 * Prepares rendered template-instance documents for language validators.
 */
export async function prepareTemplateValidationPayload(
  args: PrepareTemplateValidationPayloadArguments,
): Promise<PreparedValidationPayload> {
  const configurationService = new ConfigurationService();
  const configuration = await configurationService.loadConformetryConfiguration(
    args.configurationPath,
  );
  const selectedGeneratorNames = resolveSelectedGeneratorNames(
    args.templateRuleNames === undefined
      ? { configuration }
      : {
          configuration,
          templateRuleNames: args.templateRuleNames,
        },
  );

  const preparedValidationDocuments: PreparedValidationDocument[] = [];
  const violations: string[] = [];

  for (const rawProjectPath of args.filePaths) {
    const absoluteProjectPath = path.resolve(
      args.workingDirectory,
      rawProjectPath,
    );
    if (!fs.existsSync(absoluteProjectPath)) {
      violations.push(`Missing project path ${absoluteProjectPath}`);
      continue;
    }

    if (!fs.statSync(absoluteProjectPath).isDirectory()) {
      violations.push(
        `Expected a project directory path but found file ${absoluteProjectPath}`,
      );
      continue;
    }

    const matchedCandidate = resolveBestMatchedGeneratorCandidate({
      configuration,
      projectPath: absoluteProjectPath,
      selectedGeneratorNames,
      workingDirectory: args.workingDirectory,
    });

    if (matchedCandidate === undefined) {
      continue;
    }

    const filePreparation = prepareDocumentsForGenerator({
      fileExtensions: args.fileExtensions,
      generatorCandidate: matchedCandidate,
      projectPath: absoluteProjectPath,
    });

    preparedValidationDocuments.push(...filePreparation.documents);
    violations.push(...filePreparation.violations);
  }

  return {
    checkedPaths: args.filePaths,
    documents: preparedValidationDocuments,
    violations,
  };
}

/**
 * Applies placeholder substitutions to template-relative paths.
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
 * Builds file paths for every file under a template directory.
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

      if (!directoryEntry.isFile()) {
        continue;
      }

      if (directoryEntry.name === "schema.json") {
        continue;
      }

      templateFilePaths.push(absoluteEntryPath);
    }
  }

  return templateFilePaths.toSorted();
}

/**
 * Builds substitutions used to render template paths and content.
 */
function createTemplateSubstitutions(args: {
  projectPath: string;
  workingDirectory: string;
}): Record<string, string> {
  const runtimeService = new GenerationRuntimeService();
  const projectName = path.basename(args.projectPath);
  const projectNameSubstitutions =
    runtimeService.buildNameSubstitutions(projectName);
  const relativeProjectPath = path.relative(
    args.workingDirectory,
    args.projectPath,
  );
  const relativePathSegments = relativeProjectPath
    .split(path.sep)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const projectType = relativePathSegments[0] ?? "applications";

  return {
    description: resolveProjectDescription(args.projectPath),
    name: projectName,
    nameCamelCase: projectNameSubstitutions["nameCamelCase"] ?? projectName,
    nameKebabCase: projectNameSubstitutions["nameKebabCase"] ?? projectName,
    namePascalCase: projectNameSubstitutions["namePascalCase"] ?? projectName,
    nameSnakeCase: projectNameSubstitutions["nameSnakeCase"] ?? projectName,
    type: projectType,
  };
}

/**
 * Resolves the best matching template generator for a project path.
 */
function resolveBestMatchedGeneratorCandidate(args: {
  configuration: ConformetryConfiguration;
  projectPath: string;
  selectedGeneratorNames: string[];
  workingDirectory: string;
}): MatchedGeneratorCandidate | undefined {
  const candidates: MatchedGeneratorCandidate[] = [];
  const inferredGeneratorNames = inferGeneratorNamesFromProjectPath({
    configuredGeneratorNames: args.selectedGeneratorNames,
    projectPath: args.projectPath,
  });

  for (const generatorName of args.selectedGeneratorNames) {
    const generatorDefinition = args.configuration.generators[generatorName];
    if (generatorDefinition === undefined) {
      continue;
    }

    const absoluteTemplateDirectoryPath = path.resolve(
      args.workingDirectory,
      generatorDefinition.templateDirectoryPath,
    );
    if (!fs.existsSync(absoluteTemplateDirectoryPath)) {
      continue;
    }

    const templateFilePaths = collectTemplateFilePaths(
      absoluteTemplateDirectoryPath,
    );
    if (templateFilePaths.length === 0) {
      continue;
    }

    const substitutions = createTemplateSubstitutions({
      projectPath: args.projectPath,
      workingDirectory: args.workingDirectory,
    });

    let existingFileCount = 0;
    for (const templateFilePath of templateFilePaths) {
      const templateRelativePath = path.relative(
        absoluteTemplateDirectoryPath,
        templateFilePath,
      );
      const instanceRelativePath = applySubstitutions(
        templateRelativePath,
        substitutions,
      );
      const instanceFilePath = path.join(
        args.projectPath,
        instanceRelativePath,
      );
      if (fs.existsSync(instanceFilePath)) {
        existingFileCount += 1;
      }
    }

    candidates.push({
      absoluteTemplateDirectoryPath,
      existingFileCount,
      generatorName,
      substitutions,
      templateFilePaths,
    });
  }

  const sortedCandidates = candidates
    .filter((candidate) => candidate.existingFileCount > 0)
    .toSorted((leftCandidate, rightCandidate) => {
      const leftPriority = inferredGeneratorNames.has(
        leftCandidate.generatorName,
      )
        ? 1
        : 0;
      const rightPriority = inferredGeneratorNames.has(
        rightCandidate.generatorName,
      )
        ? 1
        : 0;

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return rightCandidate.existingFileCount - leftCandidate.existingFileCount;
    });

  return sortedCandidates[0];
}

/**
 * Infers likely generator names from the project directory name.
 */
function inferGeneratorNamesFromProjectPath(args: {
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
 * Resolves project description from pyproject.toml, when present.
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
 * Resolves selected generator names from optional template rule names.
 */
function resolveSelectedGeneratorNames(args: {
  configuration: ConformetryConfiguration;
  templateRuleNames?: string[];
}): string[] {
  const configuredGeneratorNames = Object.keys(args.configuration.generators);

  if (
    args.templateRuleNames === undefined ||
    args.templateRuleNames.length === 0
  ) {
    return configuredGeneratorNames;
  }

  const selectedGeneratorNames = configuredGeneratorNames.filter(
    (generatorName) => args.templateRuleNames?.includes(generatorName),
  );

  return selectedGeneratorNames.length === 0
    ? configuredGeneratorNames
    : selectedGeneratorNames;
}

/**
 * Prepares documents for one matched generator candidate.
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
  const templateRenderer = new DefaultTemplateRenderer();
  const extensionSet = new Set(args.fileExtensions);
  const documents: PreparedValidationDocument[] = [];
  const violations: string[] = [];

  for (const templateFilePath of args.generatorCandidate.templateFilePaths) {
    const extension = path.extname(templateFilePath);
    if (!extensionSet.has(extension)) {
      continue;
    }

    const templateRelativePath = path.relative(
      absoluteTemplateDirectoryPath,
      templateFilePath,
    );
    const instanceRelativePath = applySubstitutions(
      templateRelativePath,
      args.generatorCandidate.substitutions,
    );
    const instanceFilePath = path.join(args.projectPath, instanceRelativePath);

    if (!fs.existsSync(instanceFilePath)) {
      violations.push(
        `Missing file ${instanceFilePath} required by template ${templateFilePath}`,
      );
      continue;
    }

    const instanceFileContent = fs.readFileSync(instanceFilePath, "utf8");
    const templateFileContent = fs.readFileSync(templateFilePath, "utf8");

    documents.push({
      filename: path.basename(instanceFilePath),
      instance: instanceFileContent,
      instanceFilePath,
      renderedTemplate: templateRenderer.render(
        templateFileContent,
        args.generatorCandidate.substitutions,
      ),
      templateFilePath,
    });
  }

  return {
    documents,
    violations,
  };
}
