// 🏷️ Types

/** Which of the two gated limits a row resolves. */
export type LimitName = "maximumBreadth" | "maximumDepth";

/**
 * How a project came by one of its limits.
 *
 * The same two words `LimitProvenance` carries, restated here because the
 * workspace's own row is read from its path rather than from that origin.
 */
export type LimitOrigin = "declared" | "inherited";

/** Options the `limits` command accepts. */
export interface LimitsCommandOptions {
  readonly config?: string | undefined;
}

/** One project's resolution of one limit, and the file the number came from. */
export interface ProjectLimitRow {
  readonly limit: LimitName;
  /** Absent when no file anywhere declares this limit — breadth, today. */
  readonly origin: LimitOrigin | undefined;
  /**
   * Workspace-relative file the number is written in.
   *
   * Relative rather than absolute because the listing is read against a
   * checkout, and an absolute path says where somebody else's machine keeps
   * this repository. Absent when nothing declares the limit, and when the run
   * found no configuration file at all and is on the tool's own defaults.
   */
  readonly path: string | undefined;
  /** Workspace-relative project root, absent on the workspace's own row. */
  readonly project: string | undefined;
  /** Absent when no file anywhere declares this limit. */
  readonly value: number | undefined;
}
