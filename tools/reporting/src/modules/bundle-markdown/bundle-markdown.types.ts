// 🏷️ Types

import type { MetricRow, ProjectFailure } from "../bundles/bundles.types";

/** A project's size metrics, kept in the order its configuration declares them. */
export interface ProjectGroup {
  project: string;
  rows: MetricRow[];
}

/** Arguments for rendering the whole section. */
export interface RenderSectionArguments {
  baselineUrl: string | undefined;
  /** What this run could not measure, so an absent row is never silent. */
  failures: readonly ProjectFailure[];
  rows: readonly MetricRow[];
}

/** Workspace-wide totals, and the change against the baseline. */
export interface SizeSummary {
  delta: number | undefined;
  fraction: number | undefined;
  total: number;
}
