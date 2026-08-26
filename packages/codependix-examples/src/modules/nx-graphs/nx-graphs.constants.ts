// ♟️ Constants

import type { FixtureProject, FixtureWorkspace } from "./nx-graphs.types";

/** Root the fixture workspaces' project roots are resolved against. */
export const FIXTURE_WORKSPACE_ROOT = "/atlas";

/** The project every Neighborhood example is centered on. */
export const SUBJECT_PROJECT_NAME = "atlas-service";

/**
 * The fixture workspace's projects, including its root project.
 *
 * The root project is carried deliberately: `NeighborhoodService.readProjects`
 * drops every node whose root is `"."`, so its absence from every diagram is
 * something the examples show rather than assert.
 */
export const ATLAS_PROJECTS: FixtureProject[] = [
  { name: "atlas-application", root: "applications/atlas-application" },
  { name: "atlas-core", root: "packages/atlas-core" },
  { name: "atlas-service", root: "packages/atlas-service" },
  { name: "atlas-workspace", root: "." },
];

/** A three-deep chain: application depends on service depends on core. */
export const ATLAS_CHAIN: FixtureWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-service", type: "static" },
    { source: "atlas-service", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** The same chain, with the application's edge inferred from configuration. */
export const ATLAS_INFERRED: FixtureWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-service", type: "implicit" },
    { source: "atlas-service", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** One pair declared both statically and implicitly, in that order. */
export const ATLAS_DOUBLE_DECLARED: FixtureWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-service", type: "static" },
    { source: "atlas-application", target: "atlas-service", type: "implicit" },
  ],
  projects: ATLAS_PROJECTS,
};

/** A project the graph reports as depending on itself. */
export const ATLAS_SELF_DEPENDENT: FixtureWorkspace = {
  dependencies: [
    { source: "atlas-service", target: "atlas-core", type: "static" },
    { source: "atlas-service", target: "atlas-service", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** A dependency on a package outside the workspace. */
export const ATLAS_EXTERNAL: FixtureWorkspace = {
  dependencies: [
    { source: "atlas-service", target: "atlas-core", type: "static" },
    { source: "atlas-service", target: "npm:zod", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/** A workspace whose subject project touches nothing at all. */
export const ATLAS_UNCONNECTED: FixtureWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};

/**
 * The chain after an edge is added somewhere else in the workspace.
 *
 * `atlas-core` is untouched by the change and its Neighborhood still moves,
 * which is why this repository gates no pull request on `codependix --check`.
 */
export const ATLAS_CHAIN_AFTER_DRIFT: FixtureWorkspace = {
  dependencies: [
    { source: "atlas-application", target: "atlas-core", type: "static" },
    { source: "atlas-application", target: "atlas-service", type: "static" },
    { source: "atlas-service", target: "atlas-core", type: "static" },
  ],
  projects: ATLAS_PROJECTS,
};
