import fs from "node:fs";
import path from "node:path";

import type { ConformetryConfiguration } from "../configuration/configuration.types.js";

import type {
  CompareMatchedCandidatesArguments,
  MatchedGeneratorCandidate,
  ParsedProjectMetadata,
  PreparedValidationDocument,
  ValidationProjectTemplateMetadata,
} from "./template-validation.types.js";

interface TemplateRenderer {
  render(
    templateContent: string,
    substitutions: Record<string, string>,
  ): string;
}

/**
 * Replaces template placeholders with generated substitutions.
 */
class DefaultTemplateRenderer implements TemplateRenderer {
  public render(
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
 * Builds common name substitutions from the provided generator name.
 */
function buildNameSubstitutions(name: string): Record<string, string> {
  return {
    nameCamelCase: toCamelCase(name),
    nameKebabCase: toKebabCase(name),
    namePascalCase: toPascalCase(name),
    nameSnakeCase: toSnakeCase(name),
  };
}

/**
 * Converts a generator name to camel case.
 */
function toCamelCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) {
        return segment.toLowerCase();
      }

      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Converts a generator name to kebab case.
 */
function toKebabCase(value: string): string {
  return value
    .trim()
    .split(/[_\s]+/)
    .flatMap((segment) => {
      return segment.split(/(?=[A-Z])/);
    })
    .filter(Boolean)
    .map((segment) => {
      return segment.toLowerCase();
    })
    .join("-");
}

/**
 * Converts a generator name to Pascal case.
 */
function toPascalCase(value: string): string {
  return toCamelCase(value).replace(/^./u, (character) => {
    return character.toUpperCase();
  });
}

/**
 * Converts a generator name to snake case.
 */
function toSnakeCase(value: string): string {
  return value
    .trim()
    .split(/[-\s]+/)
    .flatMap((segment) => {
      return segment.split(/(?=[A-Z])/);
    })
    .filter(Boolean)
    .map((segment) => {
      return segment.toLowerCase();
    })
    .join("_");
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
 * Prepares validation documents for a single project path.
 */
export function prepareDocumentsForProjectPath(args: {
  configuration: ConformetryConfiguration;
  fileExtensions: string[];
  projectPath: string;
  selectedGeneratorNames: string[];
  workingDirectory: string;
}): {
  documents: PreparedValidationDocument[];
  violations: string[];
} {
  const projectPathViolations = validateProjectPath(args.projectPath);
  if (projectPathViolations.length > 0) {
    return {
      documents: [],
      violations: projectPathViolations,
    };
  }

  const matchedCandidate = resolveBestMatchedGeneratorCandidate({
    configuration: args.configuration,
    projectPath: args.projectPath,
    selectedGeneratorNames: args.selectedGeneratorNames,
    workingDirectory: args.workingDirectory,
  });
  if (matchedCandidate === undefined) {
    return {
      documents: [],
      violations: [],
    };
  }

  return prepareDocumentsForGenerator({
    fileExtensions: args.fileExtensions,
    generatorCandidate: matchedCandidate,
    projectPath: args.projectPath,
  });
}

/**
 * Creates one candidate from generator definition and project mapping.
 */
function createMatchedGeneratorCandidate(args: {
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
  const templateFilePaths = collectTemplateFilePaths(
    absoluteTemplateDirectoryPath,
  );
  if (templateFilePaths.length === 0) {
    return undefined;
  }

  const existingFileCount = countExistingTemplateMappedFiles({
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
    const documentPreparation = prepareDocumentForTemplateFile({
      extensionSet,
      generatorCandidate: args.generatorCandidate,
      projectPath: args.projectPath,
      templateFilePath,
      templateRenderer,
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
 * Resolves the best matching template generator for a project path.
 */
function resolveBestMatchedGeneratorCandidate(args: {
  configuration: ConformetryConfiguration;
  projectPath: string;
  selectedGeneratorNames: string[];
  workingDirectory: string;
}): MatchedGeneratorCandidate | undefined {
  const projectTemplateMetadata = resolveProjectTemplateMetadata(
    args.projectPath,
  );
  const inferredGeneratorNames = inferGeneratorNamesFromProjectPath({
    configuredGeneratorNames: args.selectedGeneratorNames,
    projectPath: args.projectPath,
  });
  if (projectTemplateMetadata.generatorName !== undefined) {
    inferredGeneratorNames.add(projectTemplateMetadata.generatorName);
  }

  const substitutions = createTemplateSubstitutions({
    projectPath: args.projectPath,
    projectTemplateMetadata,
    workingDirectory: args.workingDirectory,
  });
  const candidates = args.selectedGeneratorNames
    .map((generatorName) => {
      return createMatchedGeneratorCandidate({
        configuration: args.configuration,
        generatorName,
        projectPath: args.projectPath,
        substitutions,
        workingDirectory: args.workingDirectory,
      });
    })
    .filter((candidate) => candidate !== undefined);

  const sortedCandidates = candidates
    .filter((candidate) => candidate.existingFileCount > 0)
    .toSorted((leftCandidate, rightCandidate) => {
      return compareMatchedCandidates({
        inferredGeneratorNames,
        leftCandidate,
        projectTemplateMetadata,
        rightCandidate,
      });
    });

  return sortedCandidates[0];
}

/**
 * Prepares a mapped validation document for a template file.
 */
function prepareDocumentForTemplateFile(args: {
  extensionSet: Set<string>;
  generatorCandidate: MatchedGeneratorCandidate;
  projectPath: string;
  templateFilePath: string;
  templateRenderer: TemplateRenderer;
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
function resolveProjectTemplateMetadata(
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
