import fs from "node:fs";
import path from "node:path";

import {
  PROJECT_METADATA_FILENAME,
  SKIPPED_DIRECTORY_NAMES,
  TEMPLATE_RULE_NAMES_BY_PROJECT_TAG,
} from "./rule-routing.constants";

import type {
  ResolveTemplateRuleRoutingArguments,
  ResolveTemplateRuleRoutingResult,
  WorkspaceProjectMetadata,
} from "./rule-routing.types";

/**
 * Resolves routed template rules and project paths from Nx project metadata.
 */
export function resolveTemplateRuleRouting(
  args: ResolveTemplateRuleRoutingArguments,
): ResolveTemplateRuleRoutingResult {
  const workspaceProjects = discoverWorkspaceProjects(args.workingDirectory);
  const matchedProjects = resolveMatchedProjects({
    projectSelectors: args.projectSelectors,
    workspaceProjects,
  });
  const projectPaths = resolveProjectPaths({
    matchedProjects,
    projectSelectors: args.projectSelectors,
    workingDirectory: args.workingDirectory,
  });
  const applicableTemplateRuleNames = resolveApplicableTemplateRuleNames({
    configuredTemplateRuleNames: args.configuredTemplateRuleNames,
    matchedProjects,
  });
  const templateRuleNames =
    args.requestedTemplateRuleNames === undefined
      ? applicableTemplateRuleNames
      : args.requestedTemplateRuleNames.filter((requestedTemplateRuleName) => {
          return applicableTemplateRuleNames.includes(
            requestedTemplateRuleName,
          );
        });

  return {
    projectPaths,
    templateRuleNames,
  };
}

/**
 * Discovers Nx project metadata by scanning workspace project.json files.
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

    const directoryEntries = fs.readdirSync(currentDirectory, {
      withFileTypes: true,
    });

    for (const directoryEntry of directoryEntries) {
      const absoluteEntryPath = path.join(
        currentDirectory,
        directoryEntry.name,
      );

      if (directoryEntry.isDirectory()) {
        if (!SKIPPED_DIRECTORY_NAMES.has(directoryEntry.name)) {
          pendingDirectories.push(absoluteEntryPath);
        }

        continue;
      }

      if (!directoryEntry.isFile()) {
        continue;
      }

      if (directoryEntry.name !== PROJECT_METADATA_FILENAME) {
        continue;
      }

      const projectMetadata = parseWorkspaceProjectMetadata({
        projectJsonPath: absoluteEntryPath,
        workingDirectory,
      });

      if (projectMetadata !== undefined) {
        discoveredProjects.push(projectMetadata);
      }
    }
  }

  return discoveredProjects;
}

/**
 * Returns true when the provided unknown value is an object-like record.
 */
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Normalizes paths for deterministic path comparisons.
 */
function normalizePathForComparison(pathValue: string): string {
  return pathValue.replaceAll("\\", "/");
}

/**
 * Parses a project.json file into minimal routing metadata.
 */
function parseWorkspaceProjectMetadata(args: {
  projectJsonPath: string;
  workingDirectory: string;
}): WorkspaceProjectMetadata | undefined {
  const projectJson = JSON.parse(
    fs.readFileSync(args.projectJsonPath, "utf8"),
  ) as unknown;
  if (!isUnknownRecord(projectJson)) {
    return undefined;
  }

  const projectName = projectJson["name"];
  const sourceRoot = projectJson["sourceRoot"];
  const tags = projectJson["tags"];

  if (typeof projectName !== "string" || typeof sourceRoot !== "string") {
    return undefined;
  }

  return {
    name: projectName,
    rootPath: sourceRoot,
    tags: Array.isArray(tags)
      ? tags.filter((tag): tag is string => {
          return typeof tag === "string";
        })
      : [],
  };
}

/**
 * Resolves the applicable template rule names for matched projects.
 */
function resolveApplicableTemplateRuleNames(args: {
  configuredTemplateRuleNames: string[];
  matchedProjects: WorkspaceProjectMetadata[];
}): string[] {
  const configuredTemplateRuleNameSet = new Set(
    args.configuredTemplateRuleNames,
  );
  const applicableTemplateRuleNames = new Set<string>();

  for (const matchedProject of args.matchedProjects) {
    for (const projectTag of matchedProject.tags) {
      const tagMappedTemplateRuleNames =
        TEMPLATE_RULE_NAMES_BY_PROJECT_TAG[projectTag] ?? [];

      for (const templateRuleName of tagMappedTemplateRuleNames) {
        if (configuredTemplateRuleNameSet.has(templateRuleName)) {
          applicableTemplateRuleNames.add(templateRuleName);
        }
      }

      if (projectTag.startsWith("generator:")) {
        const generatorTemplateRuleName = projectTag.slice("generator:".length);
        if (configuredTemplateRuleNameSet.has(generatorTemplateRuleName)) {
          applicableTemplateRuleNames.add(generatorTemplateRuleName);
        }
      }
    }
  }

  return args.configuredTemplateRuleNames.filter(
    (configuredTemplateRuleName) => {
      return applicableTemplateRuleNames.has(configuredTemplateRuleName);
    },
  );
}

/**
 * Resolves workspace projects matched by project selectors.
 */
function resolveMatchedProjects(args: {
  projectSelectors: string[];
  workspaceProjects: WorkspaceProjectMetadata[];
}): WorkspaceProjectMetadata[] {
  const matchedProjects = new Map<string, WorkspaceProjectMetadata>();

  for (const projectSelector of args.projectSelectors) {
    const matchingByName = args.workspaceProjects.find((workspaceProject) => {
      return workspaceProject.name === projectSelector;
    });

    if (matchingByName !== undefined) {
      matchedProjects.set(matchingByName.name, matchingByName);
      continue;
    }

    const normalizedSelector = normalizePathForComparison(projectSelector);
    for (const workspaceProject of args.workspaceProjects) {
      const normalizedProjectRoot = normalizePathForComparison(
        workspaceProject.rootPath,
      );
      if (
        normalizedSelector === normalizedProjectRoot ||
        normalizedSelector.startsWith(`${normalizedProjectRoot}/`)
      ) {
        matchedProjects.set(workspaceProject.name, workspaceProject);
      }
    }
  }

  return [...matchedProjects.values()];
}

/**
 * Resolves project paths consumed by validation service.
 */
function resolveProjectPaths(args: {
  matchedProjects: WorkspaceProjectMetadata[];
  projectSelectors: string[];
  workingDirectory: string;
}): string[] {
  const projectPaths = new Set<string>();

  for (const matchedProject of args.matchedProjects) {
    projectPaths.add(matchedProject.rootPath);
  }

  if (projectPaths.size > 0) {
    return [...projectPaths].toSorted();
  }

  for (const projectSelector of args.projectSelectors) {
    const relativeSelectorPath = path.isAbsolute(projectSelector)
      ? path.relative(args.workingDirectory, projectSelector)
      : projectSelector;
    projectPaths.add(relativeSelectorPath);
  }

  return [...projectPaths].toSorted();
}
