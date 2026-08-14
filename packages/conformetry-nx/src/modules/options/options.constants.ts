// ♟️ Constants

/** The plugin's package name, used to find its entry in `nx.json`. */
export const CONFORMETRY_NX_PLUGIN_NAME = "@jimmypaolini/conformetry-nx";

/**
 * Config path used when the plugin registration names none.
 *
 * The workspace root, where a consumer would look for it first, rather than
 * any particular repository's convention for where configuration lives. A
 * workspace that keeps it elsewhere says so in its `nx.json` plugin entry.
 */
export const DEFAULT_CONFIGURATION_PATH = "conformetry.config.ts";

/** Filename the workspace's Nx configuration is read from. */
export const NX_CONFIGURATION_FILENAME = "nx.json";

/** Name of the validation target inferred onto every in-scope project. */
export const DEFAULT_VALIDATE_TARGET_NAME = "conformetry-validate";

/**
 * Option names that configure this plugin rather than a generator.
 *
 * Everything else a consumer passes is treated as a template substitution.
 */
export const PLUGIN_OPTION_NAMES = ["configurationPath", "validateTargetName"];
