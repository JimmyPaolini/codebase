// 🏷️ Types

import type { LimitProvenance } from "@callidescope/configuration";

/** Which of the two gated limits a row resolves. */
export type LimitName = "maximumBreadth" | "maximumDepth";

/**
 * How a project came by one of its limits.
 *
 * Derived from `LimitProvenance` rather than restated, so a third origin added
 * there cannot leave the renderer silently unable to say it. A row may still
 * carry none of them, which is why every use of this is optional: the
 * workspace's own row is read from the file as authored, and a number nothing
 * wrote down is still the number everything is judged against.
 */
export type LimitOrigin = LimitProvenance["origin"];

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
   * this repository. Absent whenever no file wrote the number down — nothing
   * declares the limit at all, or the run is on the tool's own default. An
   * `inherited` row can therefore carry no path: the project really did take
   * the run's number, and the run really did take it from nowhere.
   */
  readonly path: string | undefined;
  /** Workspace-relative project root, absent on the workspace's own row. */
  readonly project: string | undefined;
  /** Absent when no file anywhere declares this limit. */
  readonly value: number | undefined;
}
