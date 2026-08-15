// 🏷️ Types

/**
 * Options accepted by the generate command.
 *
 * Keys are the camel-cased long flag names, which is how commander reports
 * parsed options — `--directory` arrives as `directory`.
 */
export interface GenerateCommandOptions {
  config?: string;
  directory?: string;
  generator: string;
  /** False when `--no-interactive` was passed. */
  interactive?: boolean;
}
