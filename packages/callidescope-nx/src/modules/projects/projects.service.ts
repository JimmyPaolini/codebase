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

  /** Every tag any project carries, sorted and deduplicated. */
  private readTags(projects: readonly NxProject[]): string[] {
    return [...new Set(projects.flatMap((project) => project.tags))].toSorted(
      (first, second) => first.localeCompare(second),
    );
  }

  /** Collects the roots of the projects named, and the names nothing answers to. */
  private resolveNamedRoots(args: {
    projectNames: readonly string[];
    projects: readonly NxProject[];
  }): { roots: string[]; unknownNames: string[] } {
    const rootByName = new Map(
      args.projects.map((project) => [project.name, project.root]),
    );
    const roots: string[] = [];
    const unknownNames: string[] = [];

    for (const projectName of args.projectNames) {
      const root = rootByName.get(projectName);

      if (root === undefined) {
        unknownNames.push(projectName);
        continue;
      }

      roots.push(root);
    }

    return { roots, unknownNames };
  }

  /**
   * Collects the roots of every project carrying any of the given tags, and
   * the tags nothing carries.
   *
   * Any of them rather than all of them. Nx tags come in families whose
   * members are mutually exclusive on one project — nothing is both
   * `type:application` and `type:package` — so requiring every tag would make
   * the common selection resolve to nothing. Any is also the reading that
   * composes: each tag widens the set, the way naming another project does.
   */
  private resolveTaggedRoots(args: {
    projects: readonly NxProject[];
    tags: readonly string[];
  }): { roots: string[]; unmatchedTags: string[] } {
    const roots: string[] = [];
    const unmatchedTags: string[] = [];

    for (const tag of args.tags) {
      const tagged = args.projects.filter((project) =>
        project.tags.includes(tag),
      );

      if (tagged.length === 0) {
        unmatchedTags.push(tag);
        continue;
      }

      roots.push(...tagged.map((project) => project.root));
    }

    return { roots, unmatchedTags };
  }

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
      .map(([name, node]) => ({
        name,
        root: node.data.root,
        tags: node.data.tags ?? [],
      }))
      .toSorted((first, second) => first.name.localeCompare(second.name));
  }

  /**
   * Resolves Nx project names and tags to their workspace-relative roots.
   *
   * The two selections are unioned, not intersected: naming a project and
   * naming a tag both widen what gets traced, and a project reached both ways
   * is still one directory. Intersecting them would make `--tags` a filter on
   * `--projects`, which would resolve to nothing whenever only one was given.
   *
   * Unknown names and unmatched tags are collected rather than dropped or
   * thrown on, so one resolution reports every typo at once instead of one
   * per run, and the caller decides whether a partial resolution is worth
   * tracing.
   */
  public resolveDirectories(args: {
    graph: ProjectGraph;
    projectNames?: readonly string[] | undefined;
    tags?: readonly string[] | undefined;
  }): ResolvedProjectDirectories {
    const projects = this.readProjects(args.graph);
    const named = this.resolveNamedRoots({
      projectNames: args.projectNames ?? [],
      projects,
    });
    const tagged = this.resolveTaggedRoots({ projects, tags: args.tags ?? [] });

    return {
      directories: [...new Set([...named.roots, ...tagged.roots])].toSorted(
        (first, second) => first.localeCompare(second),
      ),
      // Already sorted, since `readProjects` sorts by name.
      knownNames: projects.map((project) => project.name),
      knownTags: this.readTags(projects),
      unknownNames: named.unknownNames,
      unmatchedTags: tagged.unmatchedTags,
    };
  }
}
