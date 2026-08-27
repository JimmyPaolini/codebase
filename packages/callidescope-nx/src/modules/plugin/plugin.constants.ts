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
 * Key the plugin's application context is cached under on `globalThis`.
 *
 * Global rather than module-level so that loading this module twice — which
 * Nx's plugin isolation can do — still yields one NestJS context per process.
 */
export const PLUGIN_CONTEXT_GLOBAL_KEY = "__callidescopePluginContext";
