// 🏷️ Types

/**
 * Describes the CLI options accepted by the validate command.
 */
export interface ValidateCommandOptions {
  config?: string;
  projects?: string[];
  rules?: string[];
}
