/**
 * Raised when the configuration path points to an unsupported file type.
 */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/**
 * Supported configuration file extensions for conformetry config loading.
 */
export const supportedExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".jsonc",
  ".mjs",
  ".mts",
  ".ts",
]);

export const DEFAULT_CONFIGURATION_PATH = "configuration/conformetry.config.ts";

export const DEFAULT_GENERATED_OUTPUT_DIRECTORY = "generated";

export const RESERVED_GENERATOR_OPTION_NAMES = new Set([
  "config",
  "description",
  "help",
  "name",
  "targetDirectoryPath",
]);

export const TARGET_DIRECTORY_OPTION_KEYS = [
  "targetDirectoryPath",
  "outputDirectoryPath",
  "outputPath",
] as const;
