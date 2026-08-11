import fs from "node:fs";
import path from "node:path";

import {
  CONFORMETRY_NX_PLUGIN_NAME,
  NX_JSON_FILENAME,
  PLUGIN_SCOPED_RULE_NAMES,
} from "./validation-project-paths.constants.js";

import type { WorkspaceProjectMetadata } from "./validation-project-paths.types.js";

/**
 * Returns true when a requested rule name targets a validator plugin directly.
 */
export function isPluginScopedRuleName(ruleName: string): boolean {
  const pluginScopedRuleNames: readonly string[] = PLUGIN_SCOPED_RULE_NAMES;

  return pluginScopedRuleNames.includes(ruleName);
}

/**
 * Normalizes a project path to a workspace-relative POSIX-like value.
 */
export function normalizeProjectPath(projectPath: string): string {
  const normalizedPath = path.normalize(projectPath).replaceAll("\\", "/");

  if (normalizedPath === ".") {
    return ".";
  }

  return normalizedPath.startsWith("./")
    ? normalizedPath.slice(2)
    : normalizedPath;
}

/**
 * Reads the conformetry Nx plugin tag-to-rule mapping from nx.json.
 */
export function readTemplateRuleNamesByProjectTag(
  workingDirectory: string,
): Readonly<Record<string, readonly string[]>> | undefined {
  const nxJsonPath = path.join(workingDirectory, NX_JSON_FILENAME);

  if (!fs.existsSync(nxJsonPath)) {
    return undefined;
  }

  const nxJson = readJsonFile(nxJsonPath);
  const plugins = readNxPlugins(nxJson);

  if (plugins === undefined) {
    return undefined;
  }

  return extractTemplateRuleNamesByProjectTagFromPlugins(plugins);
}

/**
 * Resolves the template rules that apply to the provided project tags.
 */
export function resolveApplicableTemplateRuleNames(args: {
  configuredTemplateRuleNames: string[];
  projectTags: string[];
  templateRuleNamesByProjectTag?: Readonly<Record<string, readonly string[]>>;
}): string[] {
  const configuredTemplateRuleNameSet = new Set(
    args.configuredTemplateRuleNames,
  );
  const applicableTemplateRuleNames = new Set<string>();

  for (const projectTag of args.projectTags) {
    const mappedTemplateRuleNames =
      args.templateRuleNamesByProjectTag?.[projectTag] ?? [];

    for (const mappedTemplateRuleName of mappedTemplateRuleNames) {
      if (configuredTemplateRuleNameSet.has(mappedTemplateRuleName)) {
        applicableTemplateRuleNames.add(mappedTemplateRuleName);
      }
    }

    if (!projectTag.startsWith("generator:")) {
      continue;
    }

    const generatorTemplateRuleName = projectTag.slice("generator:".length);

    if (configuredTemplateRuleNameSet.has(generatorTemplateRuleName)) {
      applicableTemplateRuleNames.add(generatorTemplateRuleName);
    }
  }

  return args.configuredTemplateRuleNames.filter((configuredTemplateRuleName) =>
    applicableTemplateRuleNames.has(configuredTemplateRuleName),
  );
}

/**
 * Resolves workspace projects matched by project selectors.
 */
export function resolveMatchedProjects(args: {
  projectSelectors: string[];
  workingDirectory: string;
  workspaceProjects: WorkspaceProjectMetadata[];
}): WorkspaceProjectMetadata[] {
  const matchedProjects = new Map<string, WorkspaceProjectMetadata>();

  for (const projectSelector of args.projectSelectors) {
    const matchingProjectByName = args.workspaceProjects.find(
      (workspaceProject) => workspaceProject.name === projectSelector,
    );

    if (matchingProjectByName !== undefined) {
      matchedProjects.set(matchingProjectByName.name, matchingProjectByName);
      continue;
    }

    for (const workspaceProject of args.workspaceProjects) {
      if (
        matchesProjectPathSelector({
          projectPath: workspaceProject.rootPath,
          projectSelector,
          workingDirectory: args.workingDirectory,
        }) ||
        matchesProjectPathSelector({
          projectPath: workspaceProject.sourceRoot,
          projectSelector,
          workingDirectory: args.workingDirectory,
        })
      ) {
        matchedProjects.set(workspaceProject.name, workspaceProject);
      }
    }
  }

  return [...matchedProjects.values()].toSorted((leftProject, rightProject) =>
    leftProject.rootPath.localeCompare(rightProject.rootPath),
  );
}

/**
 * Resolves the normalized project paths used for validation.
 */
export function resolveProjectPaths(args: {
  matchedProjects: WorkspaceProjectMetadata[];
  projectSelectors: string[];
  workingDirectory: string;
}): string[] {
  if (args.matchedProjects.length > 0) {
    return args.matchedProjects.map(
      (matchedProject) => matchedProject.rootPath,
    );
  }

  return args.projectSelectors.map((projectSelector) => {
    const relativeSelectorPath = path.isAbsolute(projectSelector)
      ? path.relative(args.workingDirectory, projectSelector)
      : projectSelector;

    return normalizeProjectPath(relativeSelectorPath);
  });
}

/**
 * Extracts the configured tag-to-rule mapping from the conformetry Nx plugin.
 */
function extractTemplateRuleNamesByProjectTagFromPlugins(
  plugins: unknown[],
): Readonly<Record<string, readonly string[]>> | undefined {
  for (const pluginDefinition of plugins) {
    const pluginRecord = readNxPluginRecord(pluginDefinition);

    if (pluginRecord?.plugin !== CONFORMETRY_NX_PLUGIN_NAME) {
      continue;
    }

    return normalizeTemplateRuleNamesByProjectTag(pluginRecord.options);
  }

  return undefined;
}

/**
 * Returns whether a value is a plain record.
 */
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Returns true when a selector resolves to a project path or one of its descendants.
 */
function matchesProjectPathSelector(args: {
  projectPath: string;
  projectSelector: string;
  workingDirectory: string;
}): boolean {
  const normalizedProjectPath = normalizeProjectPath(args.projectPath);
  const normalizedAbsoluteProjectPath = normalizeProjectPath(
    path.resolve(args.workingDirectory, args.projectPath),
  );
  const selectorCandidates = new Set<string>([
    normalizeProjectPath(args.projectSelector),
  ]);

  if (path.isAbsolute(args.projectSelector)) {
    selectorCandidates.add(
      normalizeProjectPath(
        path.relative(args.workingDirectory, args.projectSelector),
      ),
    );
  }

  for (const selectorCandidate of selectorCandidates) {
    if (
      selectorCandidate === normalizedProjectPath ||
      selectorCandidate.startsWith(`${normalizedProjectPath}/`) ||
      selectorCandidate === normalizedAbsoluteProjectPath ||
      selectorCandidate.startsWith(`${normalizedAbsoluteProjectPath}/`)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Normalizes a raw rule-name list into strings only.
 */
function normalizeRuleNames(mappedRuleNames: unknown): string[] {
  if (!Array.isArray(mappedRuleNames)) {
    return [];
  }

  const candidateRuleNames: unknown[] = mappedRuleNames;
  const normalizedRuleNames: string[] = [];

  for (const mappedRuleName of candidateRuleNames) {
    if (typeof mappedRuleName === "string") {
      normalizedRuleNames.push(mappedRuleName);
    }
  }

  return normalizedRuleNames;
}

/**
 * Normalizes the tag-to-rule mapping from raw plugin options.
 */
function normalizeTemplateRuleNamesByProjectTag(
  options: unknown,
): Readonly<Record<string, readonly string[]>> | undefined {
  if (!isUnknownRecord(options)) {
    return undefined;
  }

  const rawMapping = options["templateRuleNamesByProjectTag"];

  if (!isUnknownRecord(rawMapping)) {
    return undefined;
  }

  const normalizedMapping: Record<string, readonly string[]> = {};

  for (const [projectTag, mappedRuleNames] of Object.entries(rawMapping)) {
    const normalizedRuleNames = normalizeRuleNames(mappedRuleNames);

    if (normalizedRuleNames.length > 0) {
      normalizedMapping[projectTag] = normalizedRuleNames;
    }
  }

  return Object.keys(normalizedMapping).length > 0
    ? normalizedMapping
    : undefined;
}

/**
 * Reads and parses a JSON file.
 */
function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
}

/**
 * Returns a normalized Nx plugin record when the shape matches.
 */
function readNxPluginRecord(pluginDefinition: unknown):
  | undefined
  | {
      options?: unknown;
      plugin?: unknown;
    } {
  if (!isUnknownRecord(pluginDefinition)) {
    return undefined;
  }

  return pluginDefinition;
}

/**
 * Returns the parsed plugins array from nx.json when available.
 */
function readNxPlugins(nxJson: unknown): undefined | unknown[] {
  if (!isUnknownRecord(nxJson)) {
    return undefined;
  }

  const plugins = nxJson["plugins"];

  return Array.isArray(plugins) ? plugins : undefined;
}
