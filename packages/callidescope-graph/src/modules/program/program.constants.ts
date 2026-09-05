// ♟️ Constants

// 🚨 Errors

/**
 * Raised when a project's `tsconfig.json` cannot be parsed.
 *
 * Fatal to the whole run rather than skipped, and deliberately so. A host
 * writes its report before it weighs its findings, so a run that stepped over
 * the project would publish depths measured through a graph missing it and
 * only then fail — and on a default branch that means committing wrong numbers
 * that failing afterwards does not take back. Ending the run leaves every
 * destination exactly as it found it.
 *
 * A project that should not be read at all is a different question, answered
 * by an exclusion: `WorkspaceService.discoverProjects` drops it before its
 * configuration is ever opened.
 */
export class ProgramConfigurationError extends Error {
  constructor(args: { configurationPath: string; messages: string[] }) {
    super(
      `Could not read ${args.configurationPath}: ${args.messages.join("; ")}`,
    );
    this.name = "ProgramConfigurationError";
  }
}
