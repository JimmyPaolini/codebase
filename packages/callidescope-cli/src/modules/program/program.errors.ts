// 🚨 Errors

/**
 * Raised when a project's `tsconfig.json` cannot be parsed.
 *
 * Parsing failures are fatal rather than skipped: a project silently dropped
 * from the graph makes every depth measured through it wrong, and wrong
 * quietly is the one outcome a linter must not have.
 */
export class ProgramConfigurationError extends Error {
  constructor(args: { configurationPath: string; messages: string[] }) {
    super(
      `Could not read ${args.configurationPath}: ${args.messages.join("; ")}`,
    );
    this.name = "ProgramConfigurationError";
  }
}
