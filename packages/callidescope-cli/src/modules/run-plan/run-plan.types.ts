// 🏷️ Types

import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/** What a command line and its configuration resolved to. */
export interface PreparedRun {
  readonly configuration: ResolvedCallidescopeConfiguration;
  readonly mode: RunMode;
  readonly workspaceRoot: string;
}

/** Arguments accepted when weighing what a run found. */
export interface ReportFindingsArguments {
  readonly mode: RunMode;
  readonly result: CallGraphResult;
  /**
   * Destinations found not to hold the current report. Only ever non-empty
   * when the run was comparing, since nothing else reads a destination.
   */
  readonly stalePaths: readonly string[];
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
