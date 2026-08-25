import { readdirSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  PYTHON_FILE_EXTENSION,
  PYTHON_PROJECT_EXCLUDED_DIRECTORY_NAMES,
  PYTHON_PROJECT_TAG,
} from "./python-project.constants";

import type { PythonProject } from "./python-project.types";
import type { ProjectGraph } from "@nx/devkit";

/**
 * Discovers the workspace's Python projects and lists each one's source
 * files.
 *
 * Discovery reads the Nx project graph's own `language:python` tag, the same
 * way `codependix-nestjs`'s `NestjsProjectService` reads `framework:nestjs` —
 * rather than probing for a marker file, since a Python project's own
 * `pyproject.toml` is optional (every project is already a member of the
 * workspace root's, per the `write-python` skill).
 */
@Injectable()
export class PythonProjectService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Recursively lists every `.py` file beneath a directory, depth first. */
  private listSourceFilesInDirectory(directory: string): string[] {
    const sourceFileNames: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        if (PYTHON_PROJECT_EXCLUDED_DIRECTORY_NAMES.has(entry.name)) continue;
        sourceFileNames.push(...this.listSourceFilesInDirectory(entryPath));
      } else if (entry.name.endsWith(PYTHON_FILE_EXTENSION)) {
        sourceFileNames.push(entryPath);
      }
    }

    return sourceFileNames;
  }

  // 🌎 Public Methods

  /** Describes a project by its directory and Nx project name. */
  describeProject(absoluteRoot: string, name: string): PythonProject {
    return { absoluteRoot, name };
  }

  /**
   * Filters an already-read list of Nx projects down to the ones tagged
   * `language:python`, and describes each one.
   *
   * Projects are returned in the order they were given, which callers keep
   * sorted by name — the same order `TypescriptProjectService.discoverProjects`
   * preserves.
   */
  discoverProjects(
    graph: ProjectGraph,
    projects: { absoluteRoot: string; name: string }[],
  ): PythonProject[] {
    return projects
      .filter((project) => this.isPythonProject(graph, project.name))
      .map((project) =>
        this.describeProject(project.absoluteRoot, project.name),
      );
  }

  /** Reports whether a project's Nx tags mark it as a Python project. */
  isPythonProject(graph: ProjectGraph, projectName: string): boolean {
    return (graph.nodes[projectName]?.data.tags ?? []).includes(
      PYTHON_PROJECT_TAG,
    );
  }

  /** Lists a project's own source files, absolute and sorted. */
  listSourceFileNames(project: PythonProject): string[] {
    return this.listSourceFilesInDirectory(project.absoluteRoot).toSorted(
      (first, second) => first.localeCompare(second),
    );
  }
}
