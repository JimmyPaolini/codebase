import { Injectable } from "@nestjs/common";

import {
  MODULE_GRAPH_AMBIENT_LEGEND,
  MODULE_GRAPH_AMBIENT_MINIMUM_MODULES,
  MODULE_GRAPH_MERMAID_HEADER,
  MODULE_GRAPH_UNCONNECTED,
} from "./module-graph.constants";

import type {
  NestjsModuleGraph,
  NestjsModuleGraphEdge,
} from "./module-graph.types";
import type { SpelunkedTree } from "nestjs-spelunker";

/**
 * Reduces an explored NestJS container into a Graph and renders it.
 *
 * Ported from `tools/synchronization`'s `nestjs-module-graphs` command (see
 * issue #242), which this package replaces: the ambient-module heuristic and
 * mermaid rendering are unchanged, but the cross-project ownership and
 * grouping that command layers on top are not — codependix's Graph describes
 * one project's own container, not the workspace's opinion of who else's
 * modules it touches. `NestjsProjectService.exploreProject` is what supplies
 * the explored tree this service turns into a Graph.
 *
 * `SpelunkerModule.explore` reports the container's view rather than the
 * decorators', which means every `@Global()` module is listed as an import of
 * every other module. Drawn literally, one global module contributes an edge
 * per module in the project and buries the structure worth reading, so those
 * edges are left out and the module is drawn as a rounded node on its own.
 */
@Injectable()
export class ModuleGraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Walks the tree into the edges worth drawing and the modules they touch. */
  private collectEdges(
    tree: SpelunkedTree[],
    ambientModuleNames: Set<string>,
  ): {
    connectedModuleNames: Set<string>;
    edges: NestjsModuleGraphEdge[];
    moduleNames: Set<string>;
  } {
    const moduleNames = new Set(tree.map((node) => node.name));
    const connectedModuleNames = new Set<string>();
    const edges: NestjsModuleGraphEdge[] = [];

    for (const node of tree) {
      for (const importedName of node.imports) {
        if (ambientModuleNames.has(importedName)) continue;

        edges.push({ source: node.name, target: importedName });
        moduleNames.add(importedName);
        connectedModuleNames.add(node.name);
        connectedModuleNames.add(importedName);
      }
    }

    return { connectedModuleNames, edges, moduleNames };
  }

  /** Sorts edges by source then target so the rendered diagram never churns. */
  private compareEdges(
    first: NestjsModuleGraphEdge,
    second: NestjsModuleGraphEdge,
  ): number {
    return (
      first.source.localeCompare(second.source) ||
      first.target.localeCompare(second.target)
    );
  }

  /** Counts how many modules import each module. */
  private countInboundEdges(tree: SpelunkedTree[]): Map<string, number> {
    const inboundCounts = new Map<string, number>();

    for (const node of tree) {
      for (const importedName of node.imports) {
        inboundCounts.set(
          importedName,
          (inboundCounts.get(importedName) ?? 0) + 1,
        );
      }
    }

    return inboundCounts;
  }

  /**
   * Names the modules every other module imports.
   *
   * A global module is registered into every module in the container, so it
   * arrives with one inbound edge short of the module count.
   */
  private findAmbientModuleNames(tree: SpelunkedTree[]): Set<string> {
    const ambientModuleNames = new Set<string>();

    if (tree.length < MODULE_GRAPH_AMBIENT_MINIMUM_MODULES) {
      return ambientModuleNames;
    }

    for (const [moduleName, count] of this.countInboundEdges(tree)) {
      if (count >= tree.length - 1) {
        ambientModuleNames.add(moduleName);
      }
    }

    return ambientModuleNames;
  }

  /** Renders a module as a plain node, or a rounded one when it is ambient. */
  private renderNode(moduleName: string, graph: NestjsModuleGraph): string {
    return graph.ambientModuleNames.includes(moduleName)
      ? `${moduleName}([${moduleName}])`
      : moduleName;
  }

  /** Sorts names into a stable order. */
  private sortNames(names: Set<string> | string[]): string[] {
    return [...names].toSorted((first, second) => first.localeCompare(second));
  }

  // 🌎 Public Methods

  /** Reduces an explored container to a Graph of its module imports. */
  buildGraph(tree: SpelunkedTree[], projectName: string): NestjsModuleGraph {
    const ambientModuleNames = this.findAmbientModuleNames(tree);
    const { connectedModuleNames, edges, moduleNames } = this.collectEdges(
      tree,
      ambientModuleNames,
    );
    const sortedModuleNames = this.sortNames(moduleNames);

    return {
      ambientModuleNames: this.sortNames(ambientModuleNames),
      edges: edges.toSorted((first, second) =>
        this.compareEdges(first, second),
      ),
      isolatedModuleNames: sortedModuleNames.filter(
        (moduleName) => !connectedModuleNames.has(moduleName),
      ),
      moduleNames: sortedModuleNames,
      projectName,
    };
  }

  /** Renders a module graph as a fenced mermaid diagram. */
  renderMermaid(graph: NestjsModuleGraph): string {
    if (graph.moduleNames.length === 0) {
      return MODULE_GRAPH_UNCONNECTED;
    }

    const lines = [
      "```mermaid",
      MODULE_GRAPH_MERMAID_HEADER,
      ...graph.moduleNames.map(
        (moduleName) => `  ${this.renderNode(moduleName, graph)}`,
      ),
      ...graph.edges.map((edge) => `  ${edge.source} --> ${edge.target}`),
      "```",
    ];

    if (graph.ambientModuleNames.length > 0) {
      lines.push("", MODULE_GRAPH_AMBIENT_LEGEND);
    }

    return lines.join("\n");
  }
}
