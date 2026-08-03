import fs from "node:fs";
import path from "node:path";

import {
  type DefaultTemplateRenderer,
  GenerationRuntimeService,
} from "@jimmypaolini/conformetry-generation";

import type {
  CompareMatchedCandidatesArguments,
  MatchedGeneratorCandidate,
  ParsedProjectMetadata,
} from "./template-validation-preparation.types.js";
import type {
  PreparedValidationDocument,
  ValidationProjectTemplateMetadata,
} from "./validation.types.js";

/**
 * Applies template placeholder substitutions.
 */
export function applySubstitutions(
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
export function collectTemplateFilePaths(
  templateDirectoryPath: string,
): string[] {
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

      if (isTemplateFile(directoryEntry.name, directoryEntry.isFile())) {
        templateFilePaths.push(absoluteEntryPath);
      }
    }
  }

  return templateFilePaths.toSorted();
}

/**
 * Compares candidate ranking values and selects the better one.
 */
export function compareMatchedCandidates(
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
export function countExistingTemplateMappedFiles(args: {
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
 * Builds substitutions used to render template paths and content.
 */
export function createTemplateSubstitutions(args: {
  projectPath: string;
  projectTemplateMetadata: ValidationProjectTemplateMetadata;
  workingDirectory: string;
}): Record<string, string> {
  const runtimeService = new GenerationRuntimeService();
  const projectName = path.basename(args.projectPath);
  const projectNameSubstitutions =
    runtimeService.buildNameSubstitutions(projectName);
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
 * Determines whether a directory entry should be included as a template file.
 */
export function isTemplateFile(entryName: string, isFile: boolean): boolean {
  if (!isFile) {
    return false;
  }

  return entryName !== "schema.json";
}

/**
 * Prepares a mapped validation document for a template file.
 */
export function prepareDocumentForTemplateFile(args: {
  extensionSet: Set<string>;
  generatorCandidate: MatchedGeneratorCandidate;
  projectPath: string;
  templateFilePath: string;
  templateRenderer: DefaultTemplateRenderer;
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
      renderedTemplate: args.templateRenderer.render(
        templateFileContent,
        args.generatorCandidate.substitutions,
      ),
      templateFilePath: args.templateFilePath,
    },
  };
}

/**
 * Resolves metadata-driven template context values for a project path.
 */
export function resolveProjectTemplateMetadata(
  projectPath: string,
): ValidationProjectTemplateMetadata {
  const projectMetadata: ValidationProjectTemplateMetadata = {
    description: resolveProjectDescription(projectPath),
  };
  const projectMetadataPath = path.join(projectPath, "project.json");
  if (!fs.existsSync(projectMetadataPath)) {
    return projectMetadata;
  }

  const projectMetadataContent = fs.readFileSync(projectMetadataPath, "utf8");
  const projectMetadataRecord = parseProjectMetadataRecord(
    projectMetadataContent,
  );
  if (projectMetadataRecord === undefined) {
    return projectMetadata;
  }

  const sourceRootType = resolveSourceRootType(projectMetadataRecord);
  if (sourceRootType !== undefined) {
    projectMetadata.type = sourceRootType;
  }

  const generatorName = resolveGeneratorNameFromTags(projectMetadataRecord);
  if (generatorName !== undefined) {
    projectMetadata.generatorName = generatorName;
  }

  return projectMetadata;
}

/**
 * Validates that the path exists and points to a directory.
 */
export function validateProjectPath(projectPath: string): string[] {
  if (!fs.existsSync(projectPath)) {
    return [`Missing project path ${projectPath}`];
  }

  if (!fs.statSync(projectPath).isDirectory()) {
    return [`Expected a project directory path but found file ${projectPath}`];
  }

  return [];
}

/**
 * Parses project metadata content into a plain record.
 */
function parseProjectMetadataRecord(
  projectMetadataContent: string,
): ParsedProjectMetadata | undefined {
  let parsedProjectMetadata: unknown;
  try {
    parsedProjectMetadata = JSON.parse(projectMetadataContent) as unknown;
  } catch {
    return undefined;
  }

  if (
    typeof parsedProjectMetadata !== "object" ||
    parsedProjectMetadata === null
  ) {
    return undefined;
  }

  const parsedProjectMetadataRecord = parsedProjectMetadata as {
    sourceRoot?: unknown;
    tags?: unknown;
  };
  const sourceRoot =
    typeof parsedProjectMetadataRecord.sourceRoot === "string"
      ? parsedProjectMetadataRecord.sourceRoot
      : undefined;
  const rawTags = toUnknownArray(parsedProjectMetadataRecord.tags);
  const tags: string[] | undefined = rawTags?.flatMap((tagValue) => {
    return typeof tagValue === "string" ? [tagValue] : [];
  });

  const parsedProjectMetadataResult: ParsedProjectMetadata = {};
  if (sourceRoot !== undefined) {
    parsedProjectMetadataResult.sourceRoot = sourceRoot;
  }
  if (tags !== undefined) {
    parsedProjectMetadataResult.tags = tags;
  }

  return parsedProjectMetadataResult;
}

/**
 * Resolves a generator tag from project metadata tags.
 */
function resolveGeneratorNameFromTags(
  projectMetadataRecord: ParsedProjectMetadata,
): string | undefined {
  if (projectMetadataRecord.tags === undefined) {
    return undefined;
  }

  for (const tag of projectMetadataRecord.tags) {
    if (!tag.startsWith("generator:")) {
      continue;
    }

    const generatorName = tag.slice("generator:".length).trim();
    if (generatorName.length > 0) {
      return generatorName;
    }
  }

  return undefined;
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
 * Resolves a stable project type for substitution rendering.
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

/**
 * Resolves sourceRoot-derived type from parsed project metadata.
 */
function resolveSourceRootType(
  projectMetadataRecord: ParsedProjectMetadata,
): string | undefined {
  if (projectMetadataRecord.sourceRoot === undefined) {
    return undefined;
  }

  return projectMetadataRecord.sourceRoot
    .split(/[\\/]/u)
    .map((segment) => segment.trim())
    .find((segment) => segment.length > 0);
}

/**
 * Narrows unknown input into a readonly unknown array.
 */
function toUnknownArray(value: unknown): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value as readonly unknown[];
}
