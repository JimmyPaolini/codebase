import {
  FileImportsWorkspaceGraphService,
  PythonService,
  TypescriptService,
} from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsModulesWorkspaceGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { WorkspaceGraphService } from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import type {
  CombinedPathResults,
  PathQueryArguments,
} from "./path-query.types";
import type { GraphRunContext } from "@codependix/boundaries";
import type { NestjsModuleGraph } from "@codependix/nestjs-modules";

/**
 * Searches for a connecting path between two nodes in codependix graphs.
 *
 * Runs a deterministic breadth-first search (BFS) over the directed edges of
 * each active graph level to find the shortest connecting path.
 */
@Injectable()
export class PathQueryService {
  // 🏗 Dependency Injection

  constructor(
    private readonly fileImportsWorkspaceGraphService: FileImportsWorkspaceGraphService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly nestjsModulesWorkspaceGraphService: NestjsModulesWorkspaceGraphService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly pythonService: PythonService,
    private readonly typescriptService: TypescriptService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds an adjacency map from directed edges with sorted targets. */
  private buildAdjacency(
    edges: readonly { source: string; target: string }[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();

    for (const edge of edges) {
      const targets = adjacency.get(edge.source) ?? [];
      targets.push(edge.target);
      adjacency.set(edge.source, targets);
    }

    for (const [source, targets] of adjacency) {
      adjacency.set(source, targets.toSorted());
    }

    return adjacency;
  }

  /**
   * Explores and builds every discovered NestJS project's module graph.
   */
  private async buildNestjsModuleGraphs(
    selectedProjects: GraphRunContext["selectedProjects"],
  ): Promise<NestjsModuleGraph[]> {
    const nestjsProjects =
      this.nestjsProjectService.discoverProjects(selectedProjects);
    const moduleGraphs: NestjsModuleGraph[] = [];

    for (const project of nestjsProjects) {
      const tree = await this.nestjsProjectService.exploreProject(project);

      moduleGraphs.push(this.moduleGraphService.buildGraph(tree, project.name));
    }

    return moduleGraphs;
  }

  /** Checks whether a node is present in the graph's node list or edges. */
  private isKnownNode(
    node: string,
    nodes: readonly string[] | undefined,
    edges: readonly { source: string; target: string }[],
  ): boolean {
    if (nodes?.includes(node) ?? false) {
      return true;
    }

    return edges.some((edge) => edge.source === node || edge.target === node);
  }

  /** Queries the file-imports workspace graph for a path between two files. */
  private queryFileImports(args: PathQueryArguments): null | string[] {
    const pythonGraphs = this.pythonService
      .discoverProjects(args.context.selectedProjects)
      .map((project) => this.pythonService.buildGraph(project));
    const typescriptGraphs = this.typescriptService
      .discoverProjects(args.context.selectedProjects)
      .map((project) =>
        this.typescriptService.buildGraph(
          this.typescriptService.buildProgram(project),
        ),
      );
    const graph = this.fileImportsWorkspaceGraphService.buildWorkspaceGraph({
      pythonGraphs,
      typescriptGraphs,
    });

    return this.findShortestPath({
      edges: graph.edges,
      from: args.from,
      nodes: graph.fileNames,
      to: args.to,
    });
  }

  /** Queries the NestJS modules workspace graph for a path between two modules. */
  private async queryNestjsModules(
    args: PathQueryArguments,
  ): Promise<null | string[]> {
    const moduleGraphs = await this.buildNestjsModuleGraphs(
      args.context.selectedProjects,
    );
    const graph =
      this.nestjsModulesWorkspaceGraphService.buildWorkspaceGraph(moduleGraphs);

    return this.findShortestPath({
      edges: graph.edges,
      from: args.from,
      nodes: graph.moduleNames,
      to: args.to,
    });
  }

  /** Queries the Nx project graph for a path between two projects. */
  private queryNxProjects(args: PathQueryArguments): null | string[] {
    const workspaceGraph = this.workspaceGraphService.buildWorkspaceGraph(
      args.context.graph,
      args.context.selectedProjects,
    );

    return this.findShortestPath({
      edges: workspaceGraph.edges,
      from: args.from,
      nodes: workspaceGraph.projectNames,
      to: args.to,
    });
  }

  /** Runs deterministic breadth-first search to find the shortest path. */
  private searchBfs(
    from: string,
    to: string,
    adjacency: Map<string, string[]>,
  ): null | string[] {
    const queue: [string, string[]][] = [[from, [from]]];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) {
        break;
      }

      const [current, path] = entry;
      if (current === to) {
        return path;
      }

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([neighbor, [...path, neighbor]]);
        }
      }
    }

    return null;
  }

  /**
   * Finds the shortest directed path between two nodes in a given edge set.
   */
  public findShortestPath(args: {
    edges: readonly { source: string; target: string }[];
    from: string;
    nodes?: readonly string[] | undefined;
    to: string;
  }): null | string[] {
    const { edges, from, nodes, to } = args;

    if (
      !this.isKnownNode(from, nodes, edges) ||
      !this.isKnownNode(to, nodes, edges)
    ) {
      return null;
    }

    if (from === to) {
      return [from];
    }

    return this.searchBfs(from, to, this.buildAdjacency(edges));
  }

  // 🌎 Public Methods

  /**
   * Queries every enabled graph type for a connecting path between two nodes.
   */
  async query(args: PathQueryArguments): Promise<CombinedPathResults> {
    const { context, from, to } = args;
    const results: CombinedPathResults = {};

    if (context.enabledGraphTypes.has("nxProjects")) {
      results.nxProjects = {
        from,
        path: this.queryNxProjects(args),
        to,
      };
    }

    if (context.enabledGraphTypes.has("fileImports")) {
      results.fileImports = {
        from,
        path: this.queryFileImports(args),
        to,
      };
    }

    if (context.enabledGraphTypes.has("nestjsModules")) {
      results.nestjsModules = {
        from,
        path: await this.queryNestjsModules(args),
        to,
      };
    }

    return results;
  }
}
