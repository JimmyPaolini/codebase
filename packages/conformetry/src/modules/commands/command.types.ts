/**
 * Describes the CLI options accepted by the generate command.
 */
export interface GenerateCommandOptions {
  config?: string;
  name?: string;
  targetDirectoryPath?: string;
}

/**
 * Describes the CLI options accepted by the validate command.
 */
export interface ValidateCommandOptions {
  config?: string;
  projects?: string[];
  rules?: string[];
}
