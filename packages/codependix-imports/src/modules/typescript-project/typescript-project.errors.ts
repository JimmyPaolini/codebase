// 🚨 Errors

/**
 * Raised when a project's `tsconfig.json` cannot be parsed.
 *
 * Parsing failures are fatal rather than skipped: a project silently dropped
 * from the export makes `codependix --check` unable to tell a genuinely empty
 * import graph from one it never actually built.
 */
export class TypescriptProjectConfigurationError extends Error {
  constructor(args: { configurationPath: string; messages: string[] }) {
    super(
      `Could not read ${args.configurationPath}: ${args.messages.join("; ")}`,
    );
    this.name = "TypescriptProjectConfigurationError";
  }
}
