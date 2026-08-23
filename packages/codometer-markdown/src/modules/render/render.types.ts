// 🏷️ Types

import type { MetricRow, ProjectFailure } from "@codometer/changes";

/** Arguments for rendering the whole section. */
export interface RenderSectionArguments {
  /** What this run could not measure, so an absent row is never silent. */
  failures: readonly ProjectFailure[];
  rows: readonly MetricRow[];
}
