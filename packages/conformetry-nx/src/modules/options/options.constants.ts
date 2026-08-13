// ♟️ Constants

/** The plugin's package name, used to find its entry in `nx.json`. */
export const CONFORMETRY_NX_PLUGIN_NAME = "@jimmypaolini/conformetry-nx";

/** Config path used when the plugin registration names none. */
export const DEFAULT_CONFIGURATION_PATH = "configuration/conformetry.config.ts";

/** Name of the validation target inferred onto every in-scope project. */
export const DEFAULT_VALIDATE_TARGET_NAME = "conformetry-validate";

/**
 * Option names that configure this plugin rather than a generator.
 *
 * Everything else a consumer passes is treated as a template substitution.
 */
export const PLUGIN_OPTION_NAMES = ["configurationPath", "validateTargetName"];
