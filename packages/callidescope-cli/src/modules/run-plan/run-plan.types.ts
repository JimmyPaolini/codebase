// 🏷️ Types

import type {
  CallidescopeLimits,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/** What a command line and its configuration resolved to. */
export interface PreparedRun {
  /**
   * The limits the workspace file itself wrote down, exactly as authored.
   *
   * Carried beside the resolved configuration because resolution manufactures
   * a default for every limit, so only this can say which numbers that file
   * really chose — and an inherited limit names a file only when one did.
   */
  readonly authoredLimits: CallidescopeLimits | undefined;
  readonly configuration: ResolvedCallidescopeConfiguration;
  /**
   * The file the configuration was read from, or `undefined` when the search
   * found none and the run is on the tool's defaults.
   *
   * The trace resolves a configuration beside every project it reaches, and
   * skips this one: a file a run was pointed at is already that run's workspace
   * configuration, and reading it again as a project's would refuse it for the
   * workspace-only fields it is entitled to set.
   */
  readonly configurationPath: string | undefined;
  readonly mode: RunMode;
  readonly workspaceRoot: string;
}

/**
 * What the run does with what it traces.
 *
 * The four are independent. Writing gates on `writes` alone, staleness on
 * `checksReports` alone, a stack that is too deep on `checksDepth` alone, and
 * a callable calling too many things on `checksBreadth` alone, so no flag
 * ever quietly turns another one on.
 */
export interface RunMode {
  readonly checksBreadth: boolean;
  readonly checksDepth: boolean;
  readonly checksReports: boolean;
  readonly writes: boolean;
}

/**
 * What the command line asked the run to do, and what it could not make sense of.
 *
 * Every complaint is collected before any of them is reported, so a command
 * line with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface RunModeSelection {
  readonly errors: readonly string[];
  readonly mode: RunMode;
}
