// 🏷️ Types

/**
 * Describes the CLI options accepted by the generate command.
 */
export interface GenerateCommandOptions {
  config?: string;
  name?: string;
  targetDirectoryPath?: string;
}

/**
 * Describes a JSON schema fragment for generator input definitions.
 */
export interface JsonSchemaDefinition {
  properties?: Record<string, unknown>;
}
