// 🏷️ Types

/** Which of the two gated limits a row resolves. */
export type LimitName = "maximumBreadth" | "maximumDepth";

/**
 * How a project came by one of its limits.
 *
 * The same two words `LimitProvenance` carries, restated here because the
 * workspace's own row is read from the file as authored rather than from that
 * origin, and can legitimately have neither word: a number nothing wrote down
 * is still the number everything is judged against.
 */
export type LimitOrigin = "declared" | "inherited";

/** Options the `limits` command accepts. */
export interface LimitsCommandOptions {
  readonly config?: string | undefined;
}

/** One project's resolution of one limit, and the file the number came from. */
export interface ProjectLimitRow {
  readonly limit: LimitName;
  /**
   * Absent when no file anywhere declares this limit — breadth, today — and on
   * a workspace limit resolution defaulted rather than the file writing it.
   */
  readonly origin: LimitOrigin | undefined;
  /**
   * Workspace-relative file the number is written in.
   *
   * Relative rather than absolute because the listing is read against a
   * checkout, and an absolute path says where somebody else's machine keeps
   * this repository. Absent whenever `origin` is: nothing declares the limit,
   * or the run is on a default nothing wrote down.
   */
  readonly path: string | undefined;
  /** Workspace-relative project root, absent on the workspace's own row. */
  readonly project: string | undefined;
  /** Absent when no file anywhere declares this limit. */
  readonly value: number | undefined;
}
