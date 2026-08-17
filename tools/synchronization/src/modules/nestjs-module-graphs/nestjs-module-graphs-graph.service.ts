import { Injectable } from "@nestjs/common";

import {
  NESTJS_MODULE_GRAPH_AMBIENT_MINIMUM_MODULES,
  NESTJS_MODULE_GRAPH_MERMAID_HEADER,
} from "./nestjs-module-graphs.constants";

import type {
  NestjsModuleGraph,
  NestjsModuleGraphEdge,
} from "./nestjs-module-graphs.types";
import type { SpelunkedTree } from "nestjs-spelunker";

/**
 * Turns an explored NestJS container into a mermaid diagram.
 *
 * `SpelunkerModule.explore` reports the container's view rather than the
 * decorators', which means every `@Global()` module is listed as an import of
 * every other module. Drawn literally, one global module contributes an edge
 * per module in the project and buries the structure worth reading, so those
 * edges are left out and the module is kept as a node on its own.
 */
@Injectable()
export class NestjsModuleGraphsGraphService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Sorts edges by source then target so the rendered diagram never churns. */
  private compareEdges(
    first: NestjsModuleGraphEdge,
    second: NestjsModuleGraphEdge,
  ): number {
    return (
      first.from.localeCompare(second.from) || first.to.localeCompare(second.to)
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
   * arrives with one inbound edge short of the module count. Nothing a project
   * actually designs reaches that: the busiest ordinary module in this
   * workspace sits at less than half.
   */
  private findAmbientModuleNames(tree: SpelunkedTree[]): Set<string> {
    const ambientModuleNames = new Set<string>();

    if (tree.length < NESTJS_MODULE_GRAPH_AMBIENT_MINIMUM_MODULES) {
      return ambientModuleNames;
    }

    for (const [moduleName, count] of this.countInboundEdges(tree)) {
      if (count >= tree.length - 1) {
        ambientModuleNames.add(moduleName);
      }
    }

    return ambientModuleNames;
  }

  /** Sorts names into a stable order. */
  private sortNames(names: Set<string> | string[]): string[] {
    return [...names].toSorted((first, second) => first.localeCompare(second));
  }

  // 🌎 Public Methods

  /** Reduces an explored container to sorted names and drawable import edges. */
  buildGraph(tree: SpelunkedTree[]): NestjsModuleGraph {
    const ambientModuleNames = this.findAmbientModuleNames(tree);
    const moduleNames = new Set(tree.map((node) => node.name));
    const connectedModuleNames = new Set<string>();
    const edges: NestjsModuleGraphEdge[] = [];

    for (const node of tree) {
      for (const importedName of node.imports) {
        if (ambientModuleNames.has(importedName)) continue;

        edges.push({ from: node.name, to: importedName });
        moduleNames.add(importedName);
        connectedModuleNames.add(node.name);
        connectedModuleNames.add(importedName);
      }
    }

    return {
      ambientModuleNames: this.sortNames(ambientModuleNames),
      edges: edges.toSorted((first, second) =>
        this.compareEdges(first, second),
      ),
      isolatedModuleNames: this.sortNames(moduleNames).filter(
        (moduleName) => !connectedModuleNames.has(moduleName),
      ),
      moduleNames: this.sortNames(moduleNames),
    };
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
