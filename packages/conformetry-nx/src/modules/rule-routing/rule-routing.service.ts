import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

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
@Injectable()
export class RuleRoutingService {
  /**
   * Handles a single directory entry while scanning workspace metadata.
   */
  private collectProjectMetadataFromDirectoryEntry(args: {
    currentDirectory: string;
    directoryEntry: fs.Dirent;
    discoveredProjects: WorkspaceProjectMetadata[];
    pendingDirectories: string[];
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
   * Normalizes paths for deterministic path comparisons.
   */
  private normalizePathForComparison(pathValue: string): string {
    return pathValue.replaceAll("\\", "/");
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
      rootPath: sourceRoot,
      tags,
    };
  }

  /**
   * Resolves the applicable template rule names for matched projects.
   */
  private resolveApplicableTemplateRuleNames(args: {
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

      const normalizedSelector =
        this.normalizePathForComparison(projectSelector);
      for (const workspaceProject of args.workspaceProjects) {
        const normalizedProjectRoot = this.normalizePathForComparison(
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
      projectPaths.add(relativeSelectorPath);
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
      },
    );
    const templateRuleNames =
      args.requestedTemplateRuleNames === undefined
        ? applicableTemplateRuleNames
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
