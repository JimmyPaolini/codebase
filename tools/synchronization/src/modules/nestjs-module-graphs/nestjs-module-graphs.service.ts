import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { Injectable } from "@nestjs/common";
import { SpelunkerModule } from "nestjs-spelunker";

import {
  NESTJS_MODULE_GRAPH_MERMAID_HEADER,
  NESTJS_MODULE_GRAPH_PROJECT_DIRECTORIES,
  NESTJS_MODULE_GRAPH_ROOT_MODULE_EXPORT,
  NESTJS_MODULE_GRAPH_ROOT_MODULE_FILE,
} from "./nestjs-module-graphs.constants";

import type {
  NestjsModuleGraph,
  NestjsModuleGraphEdge,
  NestjsProject,
} from "./nestjs-module-graphs.types";
import type { Type } from "@nestjs/common";
import type { DebuggedTree } from "nestjs-spelunker";

/**
 * Discovers the workspace's NestJS projects and renders each one's module
 * graph as mermaid.
 *
 * The graph comes from `SpelunkerModule.debug`, which walks the `@Module`
 * metadata rather than a running application. Nothing is instantiated, so a
 * project whose modules open a database connection on boot is still safe to
 * explore from a workstation or from CI.
 */
@Injectable()
export class NestjsModuleGraphsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Collects every module name and its imports, merging the duplicate entries
   * `debug` emits for a module reached by more than one path.
   */
  private collectImports(tree: DebuggedTree[]): Map<string, Set<string>> {
    const importsByModuleName = new Map<string, Set<string>>();

    for (const node of tree) {
      const imports = importsByModuleName.get(node.name) ?? new Set<string>();
      importsByModuleName.set(node.name, imports);

      for (const importedName of node.imports) {
        imports.add(importedName);
        if (!importsByModuleName.has(importedName)) {
          importsByModuleName.set(importedName, new Set<string>());
        }
      }
    }

    return importsByModuleName;
  }

  /** Sorts edges by source then target so the rendered diagram never churns. */
  private compareEdges(
    first: NestjsModuleGraphEdge,
    second: NestjsModuleGraphEdge,
  ): number {
    return (
      first.from.localeCompare(second.from) || first.to.localeCompare(second.to)
    );
  }

  /**
   * Imports a root module file and returns the module class it exports.
   *
   * The import is dynamic because the file belongs to another project, and the
   * CLI already runs under a TypeScript loader, so the source is read directly
   * rather than a build output.
   */
  private async loadRootModule(project: NestjsProject): Promise<Type<unknown>> {
    const loaded = (await import(
      pathToFileURL(project.rootModuleFile).href
    )) as Record<string, Type<unknown> | undefined>;
    const rootModule = loaded[NESTJS_MODULE_GRAPH_ROOT_MODULE_EXPORT];

    if (typeof rootModule !== "function") {
      throw new TypeError(
        `Expected ${project.rootModuleFile} to export a ${NESTJS_MODULE_GRAPH_ROOT_MODULE_EXPORT} class`,
      );
    }

    return rootModule;
  }

  // 🌎 Public Methods

  /** Reduces a spelunked module tree to sorted names and import edges. */
  buildGraph(tree: DebuggedTree[]): NestjsModuleGraph {
    const importsByModuleName = this.collectImports(tree);
    const edges: NestjsModuleGraphEdge[] = [];
    const connectedModuleNames = new Set<string>();

    for (const [moduleName, importedNames] of importsByModuleName) {
      for (const importedName of importedNames) {
        edges.push({ from: moduleName, to: importedName });
        connectedModuleNames.add(moduleName);
        connectedModuleNames.add(importedName);
      }
    }

    const moduleNames = [...importsByModuleName.keys()].toSorted(
      (first, second) => first.localeCompare(second),
    );

    return {
      edges: edges.toSorted((first, second) =>
        this.compareEdges(first, second),
      ),
      isolatedModuleNames: moduleNames.filter(
        (moduleName) => !connectedModuleNames.has(moduleName),
      ),
      moduleNames,
    };
  }

  /**
   * Finds every project that bootstraps a NestJS root module.
   *
   * Projects are returned in a stable order so a run reports them the same way
   * every time regardless of how the filesystem enumerates directories.
   */
  discoverProjects(workspaceRoot: string): NestjsProject[] {
    const projects: NestjsProject[] = [];

    for (const directory of NESTJS_MODULE_GRAPH_PROJECT_DIRECTORIES) {
      const absoluteDirectory = path.join(workspaceRoot, directory);
      if (!existsSync(absoluteDirectory)) continue;

      for (const entry of readdirSync(absoluteDirectory, {
        withFileTypes: true,
      })) {
        if (!entry.isDirectory()) continue;

        const absoluteRoot = path.join(absoluteDirectory, entry.name);
        const rootModuleFile = path.join(
          absoluteRoot,
          NESTJS_MODULE_GRAPH_ROOT_MODULE_FILE,
        );

        if (existsSync(rootModuleFile)) {
          projects.push({ absoluteRoot, name: entry.name, rootModuleFile });
        }
      }
    }

    return projects.toSorted((first, second) =>
      first.name.localeCompare(second.name),
    );
  }

  /** Loads a project's root module and reduces it to a module graph. */
  async exploreProject(project: NestjsProject): Promise<NestjsModuleGraph> {
    const rootModule = await this.loadRootModule(project);
    const tree = await SpelunkerModule.debug(rootModule);

    return this.buildGraph(tree);
  }

  /** Renders a module graph as a fenced mermaid diagram. */
  renderMermaid(graph: NestjsModuleGraph): string {
    const lines = ["```mermaid", NESTJS_MODULE_GRAPH_MERMAID_HEADER];

    for (const moduleName of graph.isolatedModuleNames) {
      lines.push(`  ${moduleName}`);
    }
    for (const edge of graph.edges) {
      lines.push(`  ${edge.from} --> ${edge.to}`);
    }

    lines.push("```");

    return lines.join("\n");
  }
}
