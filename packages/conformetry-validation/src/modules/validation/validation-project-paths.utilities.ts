import fs from "node:fs";
import path from "node:path";

import {
  PROJECT_METADATA_FILENAME,
  SKIPPED_DIRECTORY_NAMES,
} from "./validation-project-paths.constants.js";
import {
  isPluginScopedRuleName,
  normalizeProjectPath,
  readTemplateRuleNamesByProjectTag,
  resolveApplicableTemplateRuleNames,
  resolveMatchedProjects,
  resolveProjectPaths,
} from "./validation-project-selection.utilities.js";

import type { WorkspaceProjectMetadata } from "./validation-project-paths.types.js";

/**
 * Discovers real workspace project roots by scanning project.json metadata.
 */
export function discoverWorkspaceProjectPaths(
  workingDirectory: string,
): string[] {
  return discoverWorkspaceProjects(workingDirectory).map(
    (workspaceProject) => workspaceProject.rootPath,
  );
}

/**
 * Resolves the validation project paths and template rules that apply to the
 * selected projects.
 */
export function resolveValidationSelection(args: {
  configuredTemplateRuleNames: string[];
  requestedProjectPaths?: string[];
  requestedRuleNames?: string[];
  workingDirectory: string;
}): {
  projectPaths: string[];
  templateRuleNames: string[];
} {
  const workspaceProjects = discoverWorkspaceProjects(args.workingDirectory);
  const templateRuleNamesByProjectTag = readTemplateRuleNamesByProjectTag(
    args.workingDirectory,
  );
  const requestedProjectPaths = args.requestedProjectPaths ?? [];
  const requestedRuleNames = args.requestedRuleNames ?? [];
  const requestedTemplateRuleNames = requestedRuleNames.filter(
    (requestedRuleName) => !isPluginScopedRuleName(requestedRuleName),
  );
  const normalizedRequestedTemplateRuleNames =
    requestedTemplateRuleNames.filter((requestedRuleName) =>
      args.configuredTemplateRuleNames.includes(requestedRuleName),
    );
  const matchedProjects =
    requestedProjectPaths.length > 0
      ? resolveMatchedProjects({
          projectSelectors: requestedProjectPaths,
          workingDirectory: args.workingDirectory,
          workspaceProjects,
        })
      : filterProjectsForAutomaticValidation({
          configuredTemplateRuleNames: args.configuredTemplateRuleNames,
          requestedTemplateRuleNames: normalizedRequestedTemplateRuleNames,
          ...(templateRuleNamesByProjectTag === undefined
            ? {}
            : { templateRuleNamesByProjectTag }),
          workspaceProjects,
        });
  const projectPaths = resolveProjectPaths({
    matchedProjects,
    projectSelectors: requestedProjectPaths,
    workingDirectory: args.workingDirectory,
  });
  const applicableTemplateRuleNames =
    resolveApplicableTemplateRuleNamesForProjects({
      configuredTemplateRuleNames: args.configuredTemplateRuleNames,
      matchedProjects,
      ...(templateRuleNamesByProjectTag === undefined
        ? {}
        : { templateRuleNamesByProjectTag }),
    });
  const templateRuleNames = resolveTemplateRuleNames({
    applicableTemplateRuleNames,
    matchedProjects,
    requestedTemplateRuleNames: normalizedRequestedTemplateRuleNames,
  });

  return { projectPaths, templateRuleNames };
}

/**
 * Collects workspace projects from a single directory entry batch.
 */
function collectWorkspaceProjectsFromDirectory(args: {
  currentDirectory: string;
  discoveredProjects: WorkspaceProjectMetadata[];
  pendingDirectories: string[];
  workingDirectory: string;
}): void {
  const directoryEntries = fs.readdirSync(args.currentDirectory, {
    withFileTypes: true,
  });

  for (const directoryEntry of directoryEntries) {
    const entryPath = path.join(args.currentDirectory, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      if (!SKIPPED_DIRECTORY_NAMES.has(directoryEntry.name)) {
        args.pendingDirectories.push(entryPath);
      }

      continue;
    }

    if (
      !directoryEntry.isFile() ||
      directoryEntry.name !== PROJECT_METADATA_FILENAME
    ) {
      continue;
    }

    const projectMetadata = readProjectMetadata(entryPath);

    if (!isWorkspaceProjectMetadata(projectMetadata)) {
      continue;
    }

    args.discoveredProjects.push({
      name: projectMetadata.name,
      rootPath: normalizeProjectPath(
        path.relative(args.workingDirectory, path.dirname(entryPath)),
      ),
      sourceRoot: normalizeProjectPath(projectMetadata.sourceRoot),
      tags: projectMetadata.tags ?? [],
    });
  }
}

/**
 * Discovers real workspace projects by scanning project.json metadata.
 */
function discoverWorkspaceProjects(
  workingDirectory: string,
): WorkspaceProjectMetadata[] {
  const discoveredProjects: WorkspaceProjectMetadata[] = [];
  const pendingDirectories = [workingDirectory];

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop();

    if (currentDirectory === undefined) {
      continue;
    }

    collectWorkspaceProjectsFromDirectory({
      currentDirectory,
      discoveredProjects,
      pendingDirectories,
      workingDirectory,
    });
  }

  return discoveredProjects.toSorted((leftProject, rightProject) =>
    leftProject.rootPath.localeCompare(rightProject.rootPath),
  );
}

/**
 * Filters workspace projects for the default "validate everything relevant"
 * flow when the caller did not specify project selectors.
 */
function filterProjectsForAutomaticValidation(args: {
  configuredTemplateRuleNames: string[];
  requestedTemplateRuleNames: string[];
  templateRuleNamesByProjectTag?: Readonly<Record<string, readonly string[]>>;
  workspaceProjects: WorkspaceProjectMetadata[];
}): WorkspaceProjectMetadata[] {
  return args.workspaceProjects.filter((workspaceProject) => {
    if (
      workspaceProject.rootPath.startsWith(
        "configuration/conformetry-templates/",
      )
    ) {
      return false;
    }

    const applicableTemplateRuleNames = resolveApplicableTemplateRuleNames({
      configuredTemplateRuleNames: args.configuredTemplateRuleNames,
      projectTags: workspaceProject.tags,
      ...(args.templateRuleNamesByProjectTag === undefined
        ? {}
        : {
            templateRuleNamesByProjectTag: args.templateRuleNamesByProjectTag,
          }),
    });
    const templateRuleNamesToMatch =
      args.requestedTemplateRuleNames.length > 0
        ? args.requestedTemplateRuleNames
        : applicableTemplateRuleNames;

    return templateRuleNamesToMatch.some((templateRuleName) =>
      applicableTemplateRuleNames.includes(templateRuleName),
    );
  });
}

/**
 * Returns whether a value is a string array.
 */
function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }

  const candidateEntries: unknown[] = value;

  for (const entry of candidateEntries) {
    if (typeof entry !== "string") {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether the parsed project metadata looks like a workspace project.
 */
function isWorkspaceProjectMetadata(
  projectMetadata: unknown,
): projectMetadata is {
  name: string;
  sourceRoot: string;
  tags?: string[];
} {
  if (typeof projectMetadata !== "object" || projectMetadata === null) {
    return false;
  }

  const projectMetadataRecord = projectMetadata as {
    name?: unknown;
    sourceRoot?: unknown;
    tags?: unknown;
  };
  const tags = isStringArray(projectMetadataRecord.tags)
    ? projectMetadataRecord.tags
    : undefined;

  return (
    typeof projectMetadataRecord.name === "string" &&
    typeof projectMetadataRecord.sourceRoot === "string" &&
    (projectMetadataRecord.tags === undefined || tags !== undefined)
  );
}

/**
 * Reads and parses a JSON file.
 */
function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

/**
 * Reads and parses project metadata from a project.json file.
 */
function readProjectMetadata(projectMetadataPath: string): unknown {
  try {
    return readJsonFile(projectMetadataPath);
  } catch {
    return undefined;
  }
}

/**
 * Resolves the configured template rules that apply across the matched projects.
 */
function resolveApplicableTemplateRuleNamesForProjects(args: {
  configuredTemplateRuleNames: string[];
  matchedProjects: WorkspaceProjectMetadata[];
  templateRuleNamesByProjectTag?: Readonly<Record<string, readonly string[]>>;
}): string[] {
  return args.configuredTemplateRuleNames.filter((configuredTemplateRuleName) =>
    args.matchedProjects.some((matchedProject) =>
      resolveApplicableTemplateRuleNames({
        configuredTemplateRuleNames: args.configuredTemplateRuleNames,
        projectTags: matchedProject.tags,
        ...(args.templateRuleNamesByProjectTag === undefined
          ? {}
          : {
              templateRuleNamesByProjectTag: args.templateRuleNamesByProjectTag,
            }),
      }).includes(configuredTemplateRuleName),
    ),
  );
}

/**
 * Resolves the final template-rule selection after routing.
 */
function resolveTemplateRuleNames(args: {
  applicableTemplateRuleNames: string[];
  matchedProjects: WorkspaceProjectMetadata[];
  requestedTemplateRuleNames: string[];
}): string[] {
  if (args.requestedTemplateRuleNames.length === 0) {
    return args.applicableTemplateRuleNames;
  }

  if (args.matchedProjects.length === 0) {
    return args.requestedTemplateRuleNames;
  }

  return args.requestedTemplateRuleNames.filter((requestedTemplateRuleName) =>
    args.applicableTemplateRuleNames.includes(requestedTemplateRuleName),
  );
}
