// ♟️ Constants

/** Name this plugin is registered under in a workspace's `nx.json`. */
export const CALLIDESCOPE_NX_PLUGIN_NAME = "@callidescope/nx";

/** Name of the inferred per-project target, when the registration names none. */
export const DEFAULT_TRACE_TARGET_NAME = "callidescope";

/**
 * Where the callidescope configuration lives, when the registration names no
 * path.
 *
 * Tried in order; the first that exists wins. Mirrors what
 * `@callidescope/configuration` searches for on its own, so a workspace that
 * never registers a path behaves the same through Nx as it does at a prompt.
 */
export const DEFAULT_CONFIGURATION_PATHS = [
  "callidescope.config.ts",
  "configuration/callidescope.config.ts",
] as const;

/** Marks a project as one whose directory holds a TypeScript program. */
export const PROJECT_PROGRAM_FILENAME = "tsconfig.json";

/**
 * Root of the workspace-level project, which is skipped during inference.
 *
 * Every other project sits inside it, so a target there would trace the whole
 * workspace under one uncacheable task — which is what the workspace-wide
 * `callidescope` target already does.
 */
export const WORKSPACE_PROJECT_ROOT = ".";
