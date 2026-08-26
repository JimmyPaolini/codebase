// 🏷️ Types

/** One project depending on another inside a fixture workspace. */
export interface FixtureDependency {
  readonly source: string;
  readonly target: string;
  /** Mirrors `ProjectGraphDependency["type"]`, which the renderer reads. */
  readonly type: "implicit" | "static";
}

/** A project inside a fixture workspace. */
export interface FixtureProject {
  readonly name: string;
  /** Workspace-relative root. `"."` marks the workspace root project. */
  readonly root: string;
}

/**
 * A whole fixture workspace, as a description the service turns into a real
 * `ProjectGraph`.
 *
 * Written as data rather than as a nested Nx workspace on disk because
 * `NeighborhoodService.readProjectGraph` resolves the project graph from the
 * process working directory and cannot be pointed anywhere else — see this
 * package's README. Every other method on `NeighborhoodService` and
 * `WorkspaceGraphService` takes the graph as an argument, so a fixture graph
 * is the graph they are handed.
 */
export interface FixtureWorkspace {
  readonly dependencies: FixtureDependency[];
  readonly projects: FixtureProject[];
}
