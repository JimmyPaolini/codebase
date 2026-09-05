// ♟️ Constants

// 🚨 Errors

/**
 * Raised when a project's `tsconfig.json` cannot be parsed.
 *
 * Caught by `buildPrograms`, which records the project as skipped and goes on
 * to build the rest. Letting it escape instead abandons the whole trace over
 * one unreadable file — and since a run reports what it found rather than what
 * it failed to reach, that presents as a workspace with no findings in it,
 * which is the one outcome a linter must not have. A skipped project is
 * carried out of the run instead, so the host can say so and fail.
 */
export class ProgramConfigurationError extends Error {
  constructor(args: { configurationPath: string; messages: string[] }) {
    super(
      `Could not read ${args.configurationPath}: ${args.messages.join("; ")}`,
    );
    this.name = "ProgramConfigurationError";
  }
}
