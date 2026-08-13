// ♟️ Constants

/**
 * Option names that select or configure the generator itself, rather than
 * feeding one of its parameters.
 *
 * `name` is deliberately absent: nearly every generator takes a `name`
 * parameter, and reserving the flag made it impossible to supply from the CLI.
 * The generator is selected with `--generator` instead.
 */
export const RESERVED_GENERATOR_OPTION_NAMES = new Set([
  "config",
  "generator",
  "help",
  "targetDirectoryPath",
]);

/** Option names accepted as the generator output directory, in precedence order. */
export const TARGET_DIRECTORY_OPTION_KEYS = [
  "targetDirectoryPath",
  "outputDirectoryPath",
  "outputPath",
] as const;

/** Subcommand token stripped from raw arguments before option scanning. */
export const GENERATE_COMMAND_TOKEN = "generate";

/** Directory generated output lands in when the caller names no target. */
export const DEFAULT_GENERATED_OUTPUT_DIRECTORY = "generated";
