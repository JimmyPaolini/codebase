import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  NESTJS_MODULE_GRAPH_IMPORT_PATTERN,
  NESTJS_MODULE_GRAPH_TYPESCRIPT_FILE_SUFFIX,
} from "./nestjs-module-graphs.constants";

import type {
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

  // 🌎 Public Methods

  /** Names the modules a named-import clause brings in. */
  private readImportedModuleNames(clause: string): string[] {
    return clause
      .split(",")
      .map((specifier) => specifier.trim().replace(/^type\s+/u, ""))
      .map((specifier) => specifier.split(/\s+as\s+/u)[0])
      .filter((name): name is string => name?.endsWith("Module") === true);
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

    for (const file of this.findSourceFiles(
      path.join(project.absoluteRoot, "src"),
    )) {
      const source = readFileSync(file, "utf8");

      for (const match of source.matchAll(NESTJS_MODULE_GRAPH_IMPORT_PATTERN)) {
        const imported = projectNamesByPackage.get(
          match.groups?.["from"] ?? "",
        );
        if (imported === undefined || imported === project.name) continue;

        projects.add(imported);
        if (match.groups?.["type"] === undefined) {
          valueImportedProjects.add(imported);
        }

        for (const moduleName of this.readImportedModuleNames(
          match.groups?.["clause"] ?? "",
        )) {
          projectsByModule.set(moduleName, imported);
        }
      }
    }

    const declared = this.readDeclaredProjects(project, projectNamesByPackage);

    return {
      projects: new Set([...projects, ...declared]),
      projectsByModule,
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
