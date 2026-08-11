import fs from "node:fs";
import path from "node:path";

import {
  PROJECT_METADATA_FILENAME,
  SKIPPED_DIRECTORY_NAMES,
} from "./rule-routing.constants.js";

import type {
  ResolveTemplateRuleRoutingArguments,
  ResolveTemplateRuleRoutingResult,
  WorkspaceProjectMetadata,
} from "./rule-routing.types.js";

/**
 * Resolves routed template rules and project paths from Nx project metadata.
 */
export class RuleRoutingService {
  /**
   * Handles a single directory entry while scanning workspace metadata.
   */
  private collectProjectMetadataFromDirectoryEntry(args: {
    currentDirectory: string;
    directoryEntry: fs.Dirent;
    discoveredProjects: WorkspaceProjectMetadata[];
    pendingDirectories: string[];
    workingDirectory: string;
  }): void {
    const absoluteEntryPath = path.join(
      args.currentDirectory,
      args.directoryEntry.name,
    );

    if (args.directoryEntry.isDirectory()) {
      this.enqueueDirectoryIfScannable({
        directoryName: args.directoryEntry.name,
        directoryPath: absoluteEntryPath,
        pendingDirectories: args.pendingDirectories,
      });
      return;
    }

    if (
      !args.directoryEntry.isFile() ||
      args.directoryEntry.name !== PROJECT_METADATA_FILENAME
    ) {
      return;
    }

    const projectMetadata = this.parseWorkspaceProjectMetadata({
      projectJsonPath: absoluteEntryPath,
      workingDirectory: args.workingDirectory,
    });

    if (projectMetadata !== undefined) {
      args.discoveredProjects.push(projectMetadata);
    }
  }

  /**
   * Discovers Nx project metadata by scanning workspace project.json files.
   */
  private discoverWorkspaceProjects(
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
        this.collectProjectMetadataFromDirectoryEntry({
          currentDirectory,
          directoryEntry,
          discoveredProjects,
          pendingDirectories,
          workingDirectory,
        });
      }
    }

    return discoveredProjects;
  }

  /**
   * Adds a directory to the scan queue when it is not skipped.
   */
  private enqueueDirectoryIfScannable(args: {
    directoryName: string;
    directoryPath: string;
    pendingDirectories: string[];
  }): void {
    if (SKIPPED_DIRECTORY_NAMES.has(args.directoryName)) {
      return;
    }

    args.pendingDirectories.push(args.directoryPath);
  }

  /**
   * Returns true when the provided unknown value is an object-like record.
   */
  private isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  /**
   * Returns true when a selector resolves to a project path or one of its descendants.
   */
  private matchesProjectPathSelector(args: {
    projectPath: string;
    projectSelector: string;
    workingDirectory: string;
  }): boolean {
    const normalizedProjectPath = this.normalizePathForComparison(
      args.projectPath,
    );
    const normalizedAbsoluteProjectPath = this.normalizePathForComparison(
      path.resolve(args.workingDirectory, args.projectPath),
    );
    const normalizedSelectorCandidates = new Set<string>([
      this.normalizePathForComparison(args.projectSelector),
    ]);

    if (path.isAbsolute(args.projectSelector)) {
      normalizedSelectorCandidates.add(
        this.normalizePathForComparison(
          path.relative(args.workingDirectory, args.projectSelector),
        ),
      );
    }

    for (const selectorCandidate of normalizedSelectorCandidates) {
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
   * Normalizes paths for deterministic path comparisons.
   */
  private normalizePathForComparison(pathValue: string): string {
    const normalizedPath = path.normalize(pathValue).replaceAll("\\", "/");
    const withoutCurrentDirectoryPrefix = normalizedPath.startsWith("./")
      ? normalizedPath.slice(2)
      : normalizedPath;

    return withoutCurrentDirectoryPrefix.endsWith("/")
      ? withoutCurrentDirectoryPrefix.slice(0, -1)
      : withoutCurrentDirectoryPrefix;
  }

  /**
   * Parses project tags into a string array.
   */
  private parseProjectTags(projectTags: unknown): string[] {
    if (!Array.isArray(projectTags)) {
      return [];
    }

    const tags: string[] = [];
    for (const projectTag of projectTags as unknown[]) {
      if (typeof projectTag === "string") {
        tags.push(projectTag);
      }
    }

    return tags;
  }

  /**
   * Parses a project.json file into minimal routing metadata.
   */
  private parseWorkspaceProjectMetadata(args: {
    projectJsonPath: string;
    workingDirectory: string;
  }): undefined | WorkspaceProjectMetadata {
    const projectJson = JSON.parse(
      fs.readFileSync(args.projectJsonPath, "utf8"),
    ) as unknown;
    if (!this.isUnknownRecord(projectJson)) {
      return undefined;
    }

    const projectName = projectJson["name"];
    const sourceRoot = projectJson["sourceRoot"];
    const tags = this.parseProjectTags(projectJson["tags"]);

    if (typeof projectName !== "string" || typeof sourceRoot !== "string") {
      return undefined;
    }

    return {
      name: projectName,
      rootPath: path.relative(
        args.workingDirectory,
        path.dirname(args.projectJsonPath),
      ),
      sourceRoot,
      tags,
    };
  }

  /**
   * Resolves the applicable template rule names for matched projects.
   */
  private resolveApplicableTemplateRuleNames(args: {
    configuredTemplateRuleNames: string[];
    matchedProjects: WorkspaceProjectMetadata[];
    templateRuleNamesByProjectTag?: Readonly<Record<string, readonly string[]>>;
  }): string[] {
    const configuredTemplateRuleNameSet = new Set(
      args.configuredTemplateRuleNames,
    );
    const applicableTemplateRuleNames = new Set<string>();
    const templateRuleNamesByProjectTag = args.templateRuleNamesByProjectTag;

    for (const matchedProject of args.matchedProjects) {
      for (const projectTag of matchedProject.tags) {
        const tagMappedTemplateRuleNames =
          templateRuleNamesByProjectTag?.[projectTag] ?? [];

        for (const templateRuleName of tagMappedTemplateRuleNames) {
          if (configuredTemplateRuleNameSet.has(templateRuleName)) {
            applicableTemplateRuleNames.add(templateRuleName);
          }
        }

        if (projectTag.startsWith("generator:")) {
          const generatorTemplateRuleName = projectTag.slice(
            "generator:".length,
          );
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
  private resolveMatchedProjects(args: {
    projectSelectors: string[];
    workingDirectory: string;
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

      for (const workspaceProject of args.workspaceProjects) {
        if (
          this.matchesProjectPathSelector({
            projectPath: workspaceProject.rootPath,
            projectSelector,
            workingDirectory: args.workingDirectory,
          }) ||
          this.matchesProjectPathSelector({
            projectPath: workspaceProject.sourceRoot,
            projectSelector,
            workingDirectory: args.workingDirectory,
          })
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
  private resolveProjectPaths(args: {
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
      projectPaths.add(this.normalizePathForComparison(relativeSelectorPath));
    }

    return [...projectPaths].toSorted();
  }

  /**
   * Resolves template rule and project path routing for the requested selectors.
   */
  public resolveTemplateRuleRouting(
    args: ResolveTemplateRuleRoutingArguments,
  ): ResolveTemplateRuleRoutingResult {
    const workspaceProjects = this.discoverWorkspaceProjects(
      args.workingDirectory,
    );
    const matchedProjects = this.resolveMatchedProjects({
      projectSelectors: args.projectSelectors,
      workingDirectory: args.workingDirectory,
      workspaceProjects,
    });
    const projectPaths = this.resolveProjectPaths({
      matchedProjects,
      projectSelectors: args.projectSelectors,
      workingDirectory: args.workingDirectory,
    });
    const applicableTemplateRuleNames = this.resolveApplicableTemplateRuleNames(
      {
        configuredTemplateRuleNames: args.configuredTemplateRuleNames,
        matchedProjects,
        ...(args.templateRuleNamesByProjectTag === undefined
          ? {}
          : {
              templateRuleNamesByProjectTag: args.templateRuleNamesByProjectTag,
            }),
      },
    );
    const configuredTemplateRuleNameSet = new Set(
      args.configuredTemplateRuleNames,
    );
    const templateRuleNames =
      args.requestedTemplateRuleNames === undefined
        ? applicableTemplateRuleNames
        : matchedProjects.length === 0
          ? args.requestedTemplateRuleNames.filter(
              (requestedTemplateRuleName) => {
                return configuredTemplateRuleNameSet.has(
                  requestedTemplateRuleName,
                );
              },
            )
          : args.requestedTemplateRuleNames.filter(
              (requestedTemplateRuleName) => {
                return applicableTemplateRuleNames.includes(
                  requestedTemplateRuleName,
                );
              },
            );

    return {
      projectPaths,
      templateRuleNames,
    };
  }
}
