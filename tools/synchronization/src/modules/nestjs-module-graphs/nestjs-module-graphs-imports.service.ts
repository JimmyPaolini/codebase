import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  NESTJS_MODULE_GRAPH_IMPORT_PATTERN,
  NESTJS_MODULE_GRAPH_MODULE_CLASS_PATTERN,
  NESTJS_MODULE_GRAPH_MODULE_FILE_SUFFIX,
  NESTJS_MODULE_GRAPH_RUNTIME_MODULE_PATTERN,
  NESTJS_MODULE_GRAPH_TYPESCRIPT_FILE_SUFFIX,
} from "./nestjs-module-graphs.constants";

import type {
  NestjsModuleGraphEdge,
  NestjsProject,
  NestjsProjectImports,
} from "./nestjs-module-graphs.types";

/**
 * Reads what each project imports from the other projects in the workspace.
 *
 * This is the module graph's own evidence of who owns a module name, and it is
 * deliberately not the Nx project graph: a diagram of imports should be
 * derived from the imports. It also answers a second question the Nx graph
 * cannot — whether a project reaches another only for its types, which is what
 * separates a dependency that is absent from this graph by nature from one
 * that is absent by accident.
 */
@Injectable()
export class NestjsModuleGraphsImportsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Finds every TypeScript file beneath a directory. */
  private findSourceFiles(directory: string): string[] {
    if (!existsSync(directory)) return [];

    const sourceFiles: string[] = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        sourceFiles.push(...this.findSourceFiles(target));
      } else if (
        entry.name.endsWith(NESTJS_MODULE_GRAPH_TYPESCRIPT_FILE_SUFFIX)
      ) {
        sourceFiles.push(target);
      }
    }

    return sourceFiles;
  }

  /** Names the workspace projects a project's own manifest depends on. */
  private readDeclaredProjects(
    project: NestjsProject,
    projectNamesByPackage: Map<string, string>,
  ): string[] {
    const manifest = path.join(project.absoluteRoot, "package.json");
    if (!existsSync(manifest)) return [];

    const { dependencies = {} } = JSON.parse(
      readFileSync(manifest, "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };

    return Object.keys(dependencies)
      .map((packageName) => projectNamesByPackage.get(packageName))
      .filter((name): name is string => name !== undefined);
  }

  /** Records what one file's static imports say about the workspace. */
  private readFileImports(options: {
    file: string;
    project: NestjsProject;
    projectNamesByPackage: Map<string, string>;
    projects: Set<string>;
    projectsByModule: Map<string, string>;
    valueImportedProjects: Set<string>;
  }): void {
    const source = readFileSync(options.file, "utf8");

    for (const match of source.matchAll(NESTJS_MODULE_GRAPH_IMPORT_PATTERN)) {
      const imported = options.projectNamesByPackage.get(
        match.groups?.["from"] ?? "",
      );
      if (imported === undefined || imported === options.project.name) continue;

      options.projects.add(imported);
      if (match.groups?.["type"] === undefined) {
        options.valueImportedProjects.add(imported);
      }

      for (const moduleName of this.readImportedModuleNames(
        match.groups?.["clause"] ?? "",
      )) {
        options.projectsByModule.set(moduleName, imported);
      }
    }
  }

  /** Names the modules a named-import clause brings in. */
  private readImportedModuleNames(clause: string): string[] {
    return clause
      .split(",")
      .map((specifier) => specifier.trim().replace(/^type\s+/u, ""))
      .map((specifier) => specifier.split(/\s+as\s+/u)[0])
      .filter((name): name is string => name?.endsWith("Module") === true);
  }

  /**
   * Names the module whose folder a file belongs to.
   *
   * A module's folder holds its constants and services, so the module beside a
   * file is the one that does whatever the file describes.
   */
  private readOwningModuleName(file: string): string | undefined {
    const directory = path.dirname(file);

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        entry.isDirectory() ||
        !entry.name.endsWith(NESTJS_MODULE_GRAPH_MODULE_FILE_SUFFIX)
      ) {
        continue;
      }

      const source = readFileSync(path.join(directory, entry.name), "utf8");
      const match = NESTJS_MODULE_GRAPH_MODULE_CLASS_PATTERN.exec(source);
      NESTJS_MODULE_GRAPH_MODULE_CLASS_PATTERN.lastIndex = 0;

      if (match?.groups?.["moduleName"] !== undefined) {
        return match.groups["moduleName"];
      }
    }

    return undefined;
  }

  // 🌎 Public Methods

  /** Reads the modules a file names as a string rather than importing. */
  private readRuntimeModuleEdges(file: string): NestjsModuleGraphEdge[] {
    const source = readFileSync(file, "utf8");
    const named = [
      ...source.matchAll(NESTJS_MODULE_GRAPH_RUNTIME_MODULE_PATTERN),
    ]
      .map((match) => match.groups?.["moduleName"])
      .filter((name): name is string => name !== undefined);

    if (named.length === 0) return [];

    const from = this.readOwningModuleName(file);
    if (from === undefined) return [];

    return named.map((to) => ({ from, runtime: true, to }));
  }

  /**
   * Reads which workspace projects one project reaches, and how.
   *
   * Both answers come from the project's own files — the imports in its source
   * and the dependencies in its manifest — so the module graph never has to
   * consult the project graph to explain itself. A project counts as reached
   * only for its types when every import of it is a `type` import, which is
   * exactly the case that contributes no module.
   */
  readProjectImports(
    project: NestjsProject,
    projectNamesByPackage: Map<string, string>,
  ): NestjsProjectImports {
    const projectsByModule = new Map<string, string>();
    const projects = new Set<string>();
    const valueImportedProjects = new Set<string>();
    const runtimeModuleEdges: NestjsModuleGraphEdge[] = [];

    for (const file of this.findSourceFiles(
      path.join(project.absoluteRoot, "src"),
    )) {
      runtimeModuleEdges.push(...this.readRuntimeModuleEdges(file));
      this.readFileImports({
        file,
        project,
        projectNamesByPackage,
        projects,
        projectsByModule,
        valueImportedProjects,
      });
    }

    const declared = this.readDeclaredProjects(project, projectNamesByPackage);

    return {
      projects: new Set([...projects, ...declared]),
      projectsByModule,
      runtimeModuleEdges,
      typeOnlyProjects: new Set(
        [...projects].filter((name) => !valueImportedProjects.has(name)),
      ),
    };
  }

  /** Maps every workspace package name to the project that publishes it. */
  readProjectNamesByPackage(projects: NestjsProject[]): Map<string, string> {
    const projectNamesByPackage = new Map<string, string>();

    for (const project of projects) {
      const manifest = path.join(project.absoluteRoot, "package.json");
      if (!existsSync(manifest)) continue;

      const { name } = JSON.parse(readFileSync(manifest, "utf8")) as {
        name?: string;
      };

      if (name !== undefined) projectNamesByPackage.set(name, project.name);
    }

    return projectNamesByPackage;
  }
}
