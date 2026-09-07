// ♟️ Constants

/**
 * Glob `createNodes` matches.
 *
 * It covers the callidescope configuration as well as every `project.json`,
 * even though only the latter describes a project. Nx re-runs a plugin when a
 * file matching its glob changes, and the target it infers carries the
 * configured limits in its cache key — so a glob of `project.json` alone would
 * leave the daemon reporting a stale result after the configuration was
 * edited.
 */
export const PROJECT_CONFIGURATION_GLOB =
  "**/{project.json,callidescope.config.*}";

/** Basename that marks a matched file as an actual project description. */
export const PROJECT_CONFIGURATION_FILENAME = "project.json";

/**
 * Cache input naming the project's own callidescope configuration — the file
 * the limits its gate enforces are written in.
 *
 * `{projectRoot}`-relative rather than a workspace-wide glob, which is the
 * whole point of it: a glob reaching every project's file would invalidate
 * every project's gate whenever any one project changed a limit, which is the
 * uncacheable workspace run this target replaces. A dependency's file is
 * covered by `^default` instead, because a scoped run measures its
 * dependencies and is judged by what they declared.
 *
 * A glob rather than one filename because the loader reads eight extensions,
 * and it matches nothing at all in a project that configures nothing — which
 * is what leaves such a project carrying the target and inheriting the
 * workspace's limits.
 */
export const PROJECT_LIMITS_INPUT = "{projectRoot}/callidescope.config.*";

/**
 * Key the plugin's application context is cached under on `globalThis`.
 *
 * Global rather than module-level so that loading this module twice — which
 * Nx's plugin isolation can do — still yields one NestJS context per process.
 */
export const PLUGIN_CONTEXT_GLOBAL_KEY = "__callidescopePluginContext";
