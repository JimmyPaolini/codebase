import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  PROJECT_METADATA_FILENAME,
  SKIPPED_DIRECTORY_NAMES,
  TEMPLATE_ROOT_PREFIX,
} from "./discovery.constants";

import type { WorkspaceProject } from "./discovery.types";

/**
 * Finds the real projects in a workspace by scanning for `project.json`.
 *
 * Template directories are excluded: they contain `project.json` files too,
 * but they describe what a project should look like rather than one that
 * exists, so scanning them would report every template as a failing project.
 */
@Injectable()
export class DiscoveryService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows a parsed `project.json` to the fields discovery needs. */
  private readProject(args: {
    metadataFilePath: string;
    workingDirectory: string;
  }): undefined | WorkspaceProject {
    let parsed: unknown;

    try {
      parsed = JSON.parse(
        fs.readFileSync(args.metadataFilePath, "utf8"),
      ) as unknown;
    } catch {
      return undefined;
    }

    if (typeof parsed !== "object" || parsed === null) {
      return undefined;
    }

    const record = parsed as { name?: unknown; tags?: unknown };

    if (typeof record.name !== "string") {
      return undefined;
    }

    const declaredTags: unknown = record.tags;
    const rawTags: unknown[] = Array.isArray(declaredTags) ? declaredTags : [];

    return {
      name: record.name,
      rootPath: this.normalizePath(
        path.relative(
          args.workingDirectory,
          path.dirname(args.metadataFilePath),
        ),
      ),
      tags: rawTags.filter((tag) => typeof tag === "string"),
    };
  }

  /**
   * Reads one directory, queueing its subdirectories and returning any project
   * it declares.
   */
  private scanDirectory(args: {
    currentDirectory: string;
    pendingDirectories: string[];
    workingDirectory: string;
  }): WorkspaceProject[] {
    const projects: WorkspaceProject[] = [];

    for (const entry of fs.readdirSync(args.currentDirectory, {
      withFileTypes: true,
    })) {
      const entryPath = path.join(args.currentDirectory, entry.name);

      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
          args.pendingDirectories.push(entryPath);
        }

        continue;
      }

      if (entry.name !== PROJECT_METADATA_FILENAME) {
        continue;
      }

      const project = this.readProject({
        metadataFilePath: entryPath,
        workingDirectory: args.workingDirectory,
      });

      if (
        project !== undefined &&
        !project.rootPath.startsWith(TEMPLATE_ROOT_PREFIX)
      ) {
        projects.push(project);
      }
    }

    return projects;
  }

  // 🌎 Public Methods

  /** Scans a workspace for its projects, sorted by root path. */
  public discoverProjects(workingDirectory: string): WorkspaceProject[] {
    const projects: WorkspaceProject[] = [];
    const pendingDirectories = [workingDirectory];

    while (pendingDirectories.length > 0) {
      const currentDirectory = pendingDirectories.pop();

      if (currentDirectory === undefined) {
        continue;
      }

      projects.push(
        ...this.scanDirectory({
          currentDirectory,
          pendingDirectories,
          workingDirectory,
        }),
      );
    }

    return projects.toSorted((left, right) => {
      return left.rootPath.localeCompare(right.rootPath);
    });
  }

  /** Normalizes a path to a workspace-relative POSIX-separated value. */
  public normalizePath(projectPath: string): string {
    const normalized = path.normalize(projectPath).replaceAll("\\", "/");

    return normalized.startsWith("./") ? normalized.slice(2) : normalized;
  }
}
