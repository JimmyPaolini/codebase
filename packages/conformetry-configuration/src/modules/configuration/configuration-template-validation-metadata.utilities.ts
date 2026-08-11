import fs from "node:fs";
import path from "node:path";

import type { createTemplateValidationOperations } from "./configuration-template-validation-operations.utilities";
import type {
  ConformetryConfiguration,
  MatchedGeneratorCandidate,
  ParsedProjectMetadata,
  ValidationProjectTemplateMetadata,
} from "./configuration.types";

/**
 * Creates a metadata-operations helper for template validation.
 */
export function createTemplateValidationMetadataOperations(
  operations: ReturnType<typeof createTemplateValidationOperations>,
): {
  parseProjectMetadataRecord: typeof parseProjectMetadataRecord;
  resolveBestMatchedGeneratorCandidate: (args: {
    configuration: ConformetryConfiguration;
    fileExtensions: string[];
    projectPath: string;
    selectedGeneratorNames: string[];
    workingDirectory: string;
  }) => MatchedGeneratorCandidate | undefined;
  resolveGeneratorNameFromTags: typeof resolveGeneratorNameFromTags;
  resolveProjectDescription: typeof resolveProjectDescription;
  resolveProjectTemplateMetadata: (
    projectPath: string,
  ) => ValidationProjectTemplateMetadata;
  resolveProjectType: typeof resolveProjectType;
  resolveSelectedGeneratorNames: (args: {
    configuration: ConformetryConfiguration;
    templateRuleNames?: string[];
  }) => string[];
  resolveSourceRootType: typeof resolveSourceRootType;
  toUnknownArray: typeof toUnknownArray;
} {
  return {
    parseProjectMetadataRecord,
    resolveBestMatchedGeneratorCandidate: (args: {
      configuration: ConformetryConfiguration;
      fileExtensions: string[];
      projectPath: string;
      selectedGeneratorNames: string[];
      workingDirectory: string;
    }) => {
      return resolveBestMatchedGeneratorCandidate(operations, args);
    },
    resolveGeneratorNameFromTags,
    resolveProjectDescription,
    resolveProjectTemplateMetadata: (projectPath: string) => {
      return resolveProjectTemplateMetadata(projectPath);
    },
    resolveProjectType,
    resolveSelectedGeneratorNames,
    resolveSourceRootType,
    toUnknownArray,
  };
}

/**
 * Parses project metadata from a JSON document.
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
 * Resolves the best generator candidate for a project path.
 */
function resolveBestMatchedGeneratorCandidate(
  operations: ReturnType<typeof createTemplateValidationOperations>,
  args: {
    configuration: ConformetryConfiguration;
    fileExtensions: string[];
    projectPath: string;
    selectedGeneratorNames: string[];
    workingDirectory: string;
  },
): MatchedGeneratorCandidate | undefined {
  const projectTemplateMetadata = resolveProjectTemplateMetadata(
    args.projectPath,
  );
  const inferredGeneratorNames = operations.inferGeneratorNamesFromProjectPath({
    configuredGeneratorNames: args.selectedGeneratorNames,
    projectPath: args.projectPath,
  });
  if (projectTemplateMetadata.generatorName !== undefined) {
    inferredGeneratorNames.add(projectTemplateMetadata.generatorName);
  }

  const substitutions = operations.createTemplateSubstitutions({
    projectPath: args.projectPath,
    projectTemplateMetadata,
    workingDirectory: args.workingDirectory,
  });
  const candidates = args.selectedGeneratorNames
    .map((generatorName) => {
      return operations.createMatchedGeneratorCandidate({
        configuration: args.configuration,
        fileExtensions: args.fileExtensions,
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
      return operations.compareMatchedCandidates({
        inferredGeneratorNames,
        leftCandidate,
        projectTemplateMetadata,
        rightCandidate,
      });
    });

  return sortedCandidates[0];
}

/**
 * Resolves the generator name from project tags.
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
 * Resolves the project description from the pyproject metadata.
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
 * Resolves template metadata for the provided project path.
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
 * Resolves the project type from the template metadata or path.
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
 * Resolves the selected generator names from the template rules.
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
    (generatorName) => {
      return args.templateRuleNames?.includes(generatorName);
    },
  );

  return selectedGeneratorNames;
}

/**
 * Resolves the source-root type from parsed metadata.
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
 * Converts a value into an unknown array when possible.
 */
function toUnknownArray(value: unknown): readonly unknown[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value as readonly unknown[];
}
