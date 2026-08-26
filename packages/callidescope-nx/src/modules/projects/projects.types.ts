// 🏷️ Types

/**
 * One Nx project, reduced to what a directory resolution needs of it.
 *
 * `codependix-nx` declares a near-identical shape and reads it out of the
 * graph the same way. They are deliberately not shared: the two packages sit
 * in different toolchains, and `configuration/eslint.config.ts` lets this one
 * depend on nothing but `logger` precisely so `@nx/devkit` cannot spread. A
 * package extracted to hold both would have to be depended on by both, which
 * is the coupling that rule exists to prevent.
 */
export interface NxProject {
  readonly name: string;
  /** Workspace-relative root, exactly as the Nx project graph states it. */
  readonly root: string;
}

/** What a set of Nx project names resolved to. */
export interface ResolvedProjectDirectories {
  /**
   * Workspace-relative roots of the names that resolved, sorted and
   * deduplicated — the form `callidescope --directories` takes.
   */
  readonly directories: string[];
  /**
   * Every project name the graph knew, sorted — what a caller names back when
   * refusing an unknown one.
   *
   * Returned rather than left for the caller to ask a second time: the
   * resolution already built this to do its own work, and a caller rebuilding
   * it would have to know how a project graph becomes a set of names.
   */
  readonly knownNames: string[];
  /**
   * The names the project graph does not know, in the order they were given.
   *
   * Reported rather than dropped: a name nobody resolves is a trace that
   * silently covers less than it was asked to, which is the one failure a
   * report cannot show you.
   */
  readonly unknownNames: string[];
}
