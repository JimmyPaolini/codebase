import { Injectable } from "@nestjs/common";
import { createProjectGraphAsync } from "@nx/devkit";

import type { NxProject, ResolvedProjectDirectories } from "./projects.types";
import type { ProjectGraph } from "@nx/devkit";

/**
 * Resolves Nx project names to the directories a callidescope run traces.
 *
 * This is the whole of callidescope's Nx awareness. `callidescope-cli` and
 * `callidescope-graph` know nothing about Nx and never read a project graph;
 * they take directories. What an Nx workspace has that plain paths do not is
 * a stable name for each of those directories, and turning one into the other
 * is the only thing this package is for.
 *
 * The project graph is passed in rather than read here, so every resolution
 * rule below is testable without a workspace to build a graph from —
 * `readProjectGraph` is the one method that touches Nx at run time.
 */
@Injectable()
export class ProjectsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Reads the workspace's Nx project graph. */
  public async readProjectGraph(): Promise<ProjectGraph> {
    return createProjectGraphAsync({ exitOnError: false });
  }

  /**
   * Lists every project the graph knows, sorted by name.
   *
   * A project rooted at the workspace root is kept rather than filtered out.
   * It resolves to `.`, which `--directories` accepts, and naming it is a
   * caller saying they mean the root program — a different thing from
   * omitting `--directories`, which walks the workspace for every
   * `tsconfig.json` there is.
   */
  public readProjects(graph: ProjectGraph): NxProject[] {
    return Object.entries(graph.nodes)
      .map(([name, node]) => ({ name, root: node.data.root }))
      .toSorted((first, second) => first.name.localeCompare(second.name));
  }

  /**
   * Resolves Nx project names to their workspace-relative roots.
   *
   * Unknown names are collected rather than dropped or thrown on, so one
   * resolution reports every typo at once instead of one per run, and the
   * caller decides whether a partial resolution is worth tracing.
   */
  public resolveDirectories(args: {
    graph: ProjectGraph;
    projectNames: readonly string[];
  }): ResolvedProjectDirectories {
    const projects = this.readProjects(args.graph);
    const rootByName = new Map(
      projects.map((project) => [project.name, project.root]),
    );
    const directories = new Set<string>();
    const unknownNames: string[] = [];

    for (const projectName of args.projectNames) {
      const root = rootByName.get(projectName);

      if (root === undefined) {
        unknownNames.push(projectName);
        continue;
      }

      directories.add(root);
    }

    return {
      directories: [...directories].toSorted((first, second) =>
        first.localeCompare(second),
      ),
      // Already sorted, since `readProjects` sorts by name.
      knownNames: projects.map((project) => project.name),
      unknownNames,
    };
  }
}
