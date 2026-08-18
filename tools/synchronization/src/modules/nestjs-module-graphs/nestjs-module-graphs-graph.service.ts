import { Injectable } from "@nestjs/common";

import {
  NESTJS_MODULE_GRAPH_AMBIENT_LEGEND,
  NESTJS_MODULE_GRAPH_AMBIENT_MINIMUM_MODULES,
  NESTJS_MODULE_GRAPH_MERMAID_HEADER,
  NESTJS_MODULE_GRAPH_RUNTIME_EDGE_LEGEND,
  NESTJS_MODULE_GRAPH_RUNTIME_LEGEND,
  NESTJS_MODULE_GRAPH_TYPE_ONLY_LEGEND,
} from "./nestjs-module-graphs.constants";

import type {
  NestjsModuleGraph,
  NestjsModuleGraphEdge,
  NestjsModuleGraphGroup,
  NestjsModuleOwnership,
} from "./nestjs-module-graphs.types";
import type { SpelunkedTree } from "nestjs-spelunker";

/**
 * Turns an explored NestJS container into a mermaid diagram.
 *
 * `SpelunkerModule.explore` reports the container's view rather than the
 * decorators', which means every `@Global()` module is listed as an import of
 * every other module. Drawn literally, one global module contributes an edge
 * per module in the project and buries the structure worth reading, so those
 * edges are left out and the module is drawn as a rounded node on its own.
 */
@Injectable()
export class NestjsModuleGraphsGraphService {
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

        edges.push({ from: node.name, runtime: false, to: importedName });
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
      first.from.localeCompare(second.from) || first.to.localeCompare(second.to)
    );
  }

  /** Orders the graphed project first, other projects next, ungrouped last. */
  private compareGroups(
    first: NestjsModuleGraphGroup,
    second: NestjsModuleGraphGroup,
    projectName: string,
  ): number {
    const rankDifference =
      this.rankGroup(first, projectName) - this.rankGroup(second, projectName);

    return rankDifference === 0
      ? String(first.projectName).localeCompare(String(second.projectName))
      : rankDifference;
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

  /** Names the imported projects no module in the graph came from. */
  private findAbsentDependencyNames(options: {
    groups: NestjsModuleGraphGroup[];
    ownership: NestjsModuleOwnership;
    projectName: string;
  }): string[] {
    const { groups, ownership, projectName } = options;
    const represented = new Set(groups.map((group) => group.projectName));
    const imports = ownership.importsByProject.get(projectName);

    return this.sortNames(
      [...(imports?.projects ?? [])].filter(
        (dependency) => !represented.has(dependency),
      ),
    );
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

  /**
   * Keeps the runtime edges worth drawing.
   *
   * A name several projects define is not evidence of anything — every
   * application defines a `MainModule`, and this command's own constants name
   * one — so only an unambiguous name earns an edge, and only when the module
   * is not already in the container.
   */
  private findRuntimeEdges(options: {
    drawnModuleNames: Set<string>;
    ownership: NestjsModuleOwnership;
    projectName: string;
  }): NestjsModuleGraphEdge[] {
    const { drawnModuleNames, ownership, projectName } = options;
    const candidates =
      ownership.importsByProject.get(projectName)?.runtimeModuleEdges ?? [];

    const kept = new Map<string, NestjsModuleGraphEdge>();

    for (const edge of candidates) {
      const definingProjects = ownership.projectsByModule.get(edge.to) ?? [];

      if (definingProjects.length === 1 && !drawnModuleNames.has(edge.to)) {
        kept.set(`${edge.from}->${edge.to}`, edge);
      }
    }

    return [...kept.values()];
  }

  /**
   * Groups modules by the project that defines them.
   *
   * The graphed project comes first, so a reader sees what it owns before what
   * it borrows; other projects follow alphabetically, and the modules
   * belonging to no workspace project come last, ungrouped.
   */
  private groupModuleNames(options: {
    moduleNames: string[];
    ownership: NestjsModuleOwnership;
    projectName: string;
  }): NestjsModuleGraphGroup[] {
    const { moduleNames, ownership, projectName } = options;
    const namesByProject = new Map<string | undefined, string[]>();

    for (const moduleName of moduleNames) {
      const owner = this.resolveOwner({ moduleName, ownership, projectName });
      namesByProject.set(owner, [
        ...(namesByProject.get(owner) ?? []),
        moduleName,
      ]);
    }

    return [...namesByProject.entries()]
      .map(([owner, names]) => ({ moduleNames: names, projectName: owner }))
      .toSorted((first, second) =>
        this.compareGroups(first, second, projectName),
      );
  }

  /** Ranks a group into the graphed project, another project, or ungrouped. */
  private rankGroup(
    group: NestjsModuleGraphGroup,
    projectName: string,
  ): number {
    if (group.projectName === projectName) return 0;

    return group.projectName === undefined ? 2 : 1;
  }

  /** Renders a module as a plain node, or a rounded one when it is ambient. */
  private renderNode(moduleName: string, graph: NestjsModuleGraph): string {
    return graph.ambientModuleNames.includes(moduleName)
      ? `${moduleName}([${moduleName}])`
      : moduleName;
  }

  /**
   * Decides which project a module name belongs to.
   *
   * The graphed project wins outright, which settles every application
   * defining a `MainModule`. A name NestJS also exports is credited to nobody,
   * because a name alone cannot tell `@nestjs/core`'s module from a workspace
   * one. Otherwise the project's own imports decide: two packages here define
   * a `ConfigurationModule`, and the source says which one was imported. A
   * name reached transitively falls back to its only definition, and anything
   * still ambiguous is credited to nobody rather than to a guess.
   */
  private resolveOwner(options: {
    moduleName: string;
    ownership: NestjsModuleOwnership;
    projectName: string;
  }): string | undefined {
    const { moduleName, ownership, projectName } = options;
    const definingProjects = ownership.projectsByModule.get(moduleName) ?? [];

    if (definingProjects.includes(projectName)) return projectName;
    if (ownership.frameworkModuleNames.has(moduleName)) return undefined;

    const imported = ownership.importsByProject
      .get(projectName)
      ?.projectsByModule.get(moduleName);

    if (imported !== undefined) return imported;

    return definingProjects.length === 1 ? definingProjects[0] : undefined;
  }

  // 🌎 Public Methods

  /** Sorts names into a stable order. */
  private sortNames(names: Set<string> | string[]): string[] {
    return [...names].toSorted((first, second) => first.localeCompare(second));
  }

  /** Reduces an explored container to grouped names and drawable import edges. */
  buildGraph(options: {
    ownership: NestjsModuleOwnership;
    projectName: string;
    tree: SpelunkedTree[];
  }): NestjsModuleGraph {
    const { ownership, projectName, tree } = options;
    const ambientModuleNames = this.findAmbientModuleNames(tree);
    const { connectedModuleNames, edges, moduleNames } = this.collectEdges(
      tree,
      ambientModuleNames,
    );

    for (const edge of this.findRuntimeEdges({
      drawnModuleNames: moduleNames,
      ownership,
      projectName,
    })) {
      edges.push(edge);
      moduleNames.add(edge.to);
      connectedModuleNames.add(edge.from);
      connectedModuleNames.add(edge.to);
    }

    const sortedModuleNames = this.sortNames(moduleNames);
    const groups = this.groupModuleNames({
      moduleNames: sortedModuleNames,
      ownership,
      projectName,
    });
    const absentDependencyNames = this.findAbsentDependencyNames({
      groups,
      ownership,
      projectName,
    });
    const typeOnlyProjects =
      ownership.importsByProject.get(projectName)?.typeOnlyProjects ??
      new Set<string>();

    return {
      ambientModuleNames: this.sortNames(ambientModuleNames),
      edges: edges.toSorted((first, second) =>
        this.compareEdges(first, second),
      ),
      groups,
      isolatedModuleNames: sortedModuleNames.filter(
        (moduleName) => !connectedModuleNames.has(moduleName),
      ),
      moduleNames: sortedModuleNames,
      runtimeDependencyNames: absentDependencyNames.filter(
        (name) => !typeOnlyProjects.has(name),
      ),
      typeOnlyDependencyNames: absentDependencyNames.filter((name) =>
        typeOnlyProjects.has(name),
      ),
    };
  }

  /** Renders one group, as a labelled subgraph unless it belongs to no project. */
  renderGroup(
    group: NestjsModuleGraphGroup,
    index: number,
    graph: NestjsModuleGraph,
  ): string[] {
    const nodes = group.moduleNames.map((moduleName) =>
      this.renderNode(moduleName, graph),
    );

    if (group.projectName === undefined) {
      return nodes.map((node) => `  ${node}`);
    }

    return [
      `  subgraph group${index}["${group.projectName}"]`,
      ...nodes.map((node) => `    ${node}`),
      "  end",
    ];
  }

  /** Renders a module graph as a fenced mermaid diagram. */
  renderMermaid(graph: NestjsModuleGraph): string {
    const lines = ["```mermaid", NESTJS_MODULE_GRAPH_MERMAID_HEADER];

    for (const [index, group] of graph.groups.entries()) {
      lines.push(...this.renderGroup(group, index, graph));
    }
    for (const edge of graph.edges) {
      lines.push(`  ${edge.from} ${edge.runtime ? "-.->" : "-->"} ${edge.to}`);
    }

    lines.push("```");

    if (graph.ambientModuleNames.length > 0) {
      lines.push("", NESTJS_MODULE_GRAPH_AMBIENT_LEGEND);
    }
    if (graph.edges.some((edge) => edge.runtime)) {
      lines.push("", NESTJS_MODULE_GRAPH_RUNTIME_EDGE_LEGEND);
    }
    for (const [names, legend] of [
      [graph.typeOnlyDependencyNames, NESTJS_MODULE_GRAPH_TYPE_ONLY_LEGEND],
      [graph.runtimeDependencyNames, NESTJS_MODULE_GRAPH_RUNTIME_LEGEND],
    ] as const) {
      if (names.length > 0) {
        lines.push("", legend.replace("%s", this.renderNameList(names)));
      }
    }

    return lines.join("\n");
  }

  /** Renders a name list as prose, with `and` before the last entry. */
  renderNameList(names: string[]): string {
    const last = names.at(-1);

    if (last === undefined) return "";
    if (names.length === 1) return last;

    return `${names.slice(0, -1).join(", ")} and ${last}`;
  }
}
