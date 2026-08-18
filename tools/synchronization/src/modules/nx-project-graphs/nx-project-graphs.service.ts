import path from "node:path";

import { Injectable } from "@nestjs/common";
import { createProjectGraphAsync } from "@nx/devkit";

import {
  NX_PROJECT_GRAPH_IMPLICIT_LEGEND,
  NX_PROJECT_GRAPH_MERMAID_HEADER,
  NX_PROJECT_GRAPH_SUBJECT_STYLE,
  NX_PROJECT_GRAPH_UNCONNECTED,
} from "./nx-project-graphs.constants";

import type {
  NxProject,
  NxProjectGraphEdge,
  NxProjectGraphNeighborhood,
} from "./nx-project-graphs.types";
import type { ProjectGraph } from "@nx/devkit";

/**
 * Reads the Nx project graph and renders each project's neighborhood in it.
 *
 * One hop in each direction is the whole point: a project's README should say
 * what it needs and who would break if it changed, not redraw the workspace.
 */
@Injectable()
export class NxProjectGraphsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Sorts edges by source then target so the rendered diagram never churns. */
  private compareEdges(
    first: NxProjectGraphEdge,
    second: NxProjectGraphEdge,
  ): number {
    return (
      first.source.localeCompare(second.source) ||
      first.target.localeCompare(second.target)
    );
  }

  /** Renders one edge, dotted when Nx inferred it from configuration. */
  private renderEdge(edge: NxProjectGraphEdge): string {
    const arrow = edge.implicit ? "-.->" : "-->";

    return `  ${this.toNodeIdentifier(edge.source)} ${arrow} ${this.toNodeIdentifier(edge.target)}`;
  }

  /** Declares one node, labelled with the project name it stands for. */
  private renderNode(projectName: string): string {
    return `  ${this.toNodeIdentifier(projectName)}["${projectName}"]`;
  }

  /** Turns a project name into an identifier mermaid accepts. */
  private toNodeIdentifier(projectName: string): string {
    return projectName.replaceAll(/[^\dA-Za-z]/gu, "_");
  }

  // 🌎 Public Methods

  /**
   * Builds every project's neighborhood from one read of the project graph.
   *
   * The workspace root project is left out: it contains every other project
   * rather than depending on them, so its neighborhood says nothing.
   */
  buildNeighborhoods(
    graph: ProjectGraph,
    projects: NxProject[],
  ): Map<string, NxProjectGraphNeighborhood> {
    const neighborhoods = new Map<string, NxProjectGraphNeighborhood>();
    const knownNames = new Set(projects.map((project) => project.name));

    for (const project of projects) {
      const edges = this.collectEdges(graph, project.name, knownNames);

      neighborhoods.set(project.name, {
        dependencies: this.sortNames(
          edges
            .filter((edge) => edge.source === project.name)
            .map((edge) => edge.target),
        ),
        dependents: this.sortNames(
          edges
            .filter((edge) => edge.target === project.name)
            .map((edge) => edge.source),
        ),
        edges: edges.toSorted((first, second) =>
          this.compareEdges(first, second),
        ),
        projectName: project.name,
      });
    }

    return neighborhoods;
  }

  /** Collects the edges touching one project in either direction. */
  collectEdges(
    graph: ProjectGraph,
    projectName: string,
    knownNames: Set<string>,
  ): NxProjectGraphEdge[] {
    const edges = new Map<string, NxProjectGraphEdge>();

    for (const [source, dependencies] of Object.entries(graph.dependencies)) {
      for (const dependency of dependencies) {
        const touches =
          source === projectName || dependency.target === projectName;
        if (!touches) continue;
        if (!knownNames.has(source) || !knownNames.has(dependency.target)) {
          continue;
        }
        if (source === dependency.target) continue;

        const key = `${source}->${dependency.target}`;
        // A pair can be declared both ways round; a static edge is the
        // stronger statement, so it wins over an implicit one.
        const implicit =
          dependency.type === "implicit" && (edges.get(key)?.implicit ?? true);

        edges.set(key, { implicit, source, target: dependency.target });
      }
    }

    return [...edges.values()];
  }

  /** Reads the workspace's project graph. */
  async readProjectGraph(): Promise<ProjectGraph> {
    return createProjectGraphAsync({ exitOnError: false });
  }

  /** Lists every project the graph knows, apart from the workspace root. */
  readProjects(graph: ProjectGraph, workspaceRoot: string): NxProject[] {
    return Object.entries(graph.nodes)
      .filter(([, node]) => node.data.root !== ".")
      .map(([name, node]) => ({
        absoluteRoot: path.join(workspaceRoot, node.data.root),
        name,
      }))
      .toSorted((first, second) => first.name.localeCompare(second.name));
  }

  /** Renders a neighborhood as a fenced mermaid diagram. */
  renderMermaid(neighborhood: NxProjectGraphNeighborhood): string {
    if (neighborhood.edges.length === 0) {
      return NX_PROJECT_GRAPH_UNCONNECTED;
    }

    const nodeNames = this.sortNames([
      ...neighborhood.dependencies,
      ...neighborhood.dependents,
      neighborhood.projectName,
    ]);
    const lines = [
      "```mermaid",
      NX_PROJECT_GRAPH_MERMAID_HEADER,
      ...nodeNames.map((nodeName) => this.renderNode(nodeName)),
      ...neighborhood.edges.map((edge) => this.renderEdge(edge)),
      NX_PROJECT_GRAPH_SUBJECT_STYLE,
      `  class ${this.toNodeIdentifier(neighborhood.projectName)} subject`,
      "```",
    ];

    if (neighborhood.edges.some((edge) => edge.implicit)) {
      lines.push("", NX_PROJECT_GRAPH_IMPLICIT_LEGEND);
    }

    return lines.join("\n");
  }

  /** Sorts names into a stable order, dropping duplicates. */
  sortNames(names: string[]): string[] {
    return [...new Set(names)].toSorted((first, second) =>
      first.localeCompare(second),
    );
  }
}
