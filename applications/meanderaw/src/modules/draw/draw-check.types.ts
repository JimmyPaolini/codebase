// 🏷️ Types

/**
 * A row present at the same lattice address in both the regenerated sweep
 * and the committed database, but disagreeing on at least one other column —
 * `svg`, `family`, `subFamily`, a junction count, `components`/`cycles`/
 * `freeEnds`, `hasBranching`/`hasCrossing`, or `provenance`.
 */
export interface ChangedMeanderDrift extends MeanderKeySummary {
  readonly differences: readonly string[];
}

/**
 * What `DrawCheckService.diff` found between a freshly regenerated sweep and
 * the committed database: every row present in one but not the other, and
 * every row present in both that disagrees on a column besides its lattice
 * address. `regeneratedCount` and `committedCount` are each set's whole size,
 * reported alongside the three categories so a passing check can still log
 * how much it verified.
 */
export interface MeanderDriftReport {
  readonly changed: readonly ChangedMeanderDrift[];
  readonly committedCount: number;
  readonly missing: readonly MeanderKeySummary[];
  readonly new: readonly MeanderKeySummary[];
  readonly regeneratedCount: number;
}

/**
 * The lattice address a diffed row is reported by — its `code`, `rows`, and
 * `columns`, the same triple `Meander`'s own unique index keys — which is
 * enough for a human to look the drawing up and re-run `--code` against it.
 */
export interface MeanderKeySummary {
  readonly code: string;
  readonly columns: number;
  readonly rows: number;
}
