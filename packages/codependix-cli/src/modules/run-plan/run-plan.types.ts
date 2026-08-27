// 🏷️ Types

/**
 * What the run does with the graphs it builds.
 *
 * The three are independent. Writing gates on `writes` alone, staleness on
 * `checksReports` alone, and a broken rule on `checksBoundaries` alone, so no
 * flag ever quietly turns another one on. That separation is the whole point
 * of the split: a stale export moves with the workspace and belongs on the
 * default branch, while a broken boundary is caused by the branch and belongs
 * on every pull request.
 */
export interface RunMode {
  readonly checksBoundaries: boolean;
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
