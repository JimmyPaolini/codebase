// ♟️ Constants

/**
 * Where the emitted plugin is written, relative to the workspace root.
 *
 * A dot directory, and gitignored, because the plugin is derived from the
 * configuration rather than authored: committing it invites edits that the
 * next emit silently reverts. It is bootstrapped on install instead.
 */
export const DEFAULT_OUTPUT_PATH = ".conformetry/nx-generators";

/**
 * Header warning readers that a file is emitted and will be overwritten.
 *
 * Names no single command, because two write these files: the postinstall
 * bootstrap and `nx sync`.
 */
export const GENERATED_FILE_NOTICE =
  "// Generated from the conformetry configuration. Do not edit.";

/** Message `nx sync:check` prints when the emitted plugin is stale. */
export const OUT_OF_SYNC_MESSAGE =
  "The conformetry generator plugin is out of sync with the conformetry configuration.";

/** Indent width for emitted JSON, matching the workspace formatter. */
export const JSON_INDENT = 2;

/**
 * Package name the emitted plugin is addressed by in `nx g <name>:<gen>`.
 *
 * Scoped to conformetry rather than to any one author: every consumer emits
 * this package, so a personal scope would put someone else's name in the
 * command they type.
 */
export const DEFAULT_PACKAGE_NAME = "@conformetry/nx-generators";

/** The JSON schema editors validate an emitted `generators.json` against. */
export const GENERATORS_SCHEMA_PATH =
  "node_modules/@nx/devkit/src/generators/generators-schema.json";
