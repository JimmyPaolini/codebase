// 🚨 Errors

/**
 * Raised when a target carrying a limit matched no files at all.
 *
 * Writing a limit asserts the files exist, so nothing to measure means a glob
 * that no longer matches or a build that never ran — either way a number that
 * would pass every limit written against it. A target nobody limited is left
 * alone: there it is simply zero, and unremarkable.
 */
export class EmptyTargetError extends Error {
  constructor(target: string, metric: string) {
    super(
      `Target "${target}" matched no files, and a limit is written against its "${metric}" metric. A limit says the files are there, so an empty match is a glob that stopped matching or a build that never ran — not a measurement of zero.`,
    );
    this.name = "EmptyTargetError";
  }
}
