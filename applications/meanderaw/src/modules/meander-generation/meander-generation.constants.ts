// ♟️ Constants

import type { MeanderType } from "./meander-generation.types";

/** Fixed canvas height every meander is drawn against, in grid units. */
export const CANVAS_HEIGHT = 60;

/** Highest `rows` value the CLI accepts for any type. */
export const MAXIMUM_ROWS = 12;

/** Highest `repeatCount` value the CLI accepts for any type. */
export const MAXIMUM_REPEAT_COUNT = 12;

export const STROKE_COLOR = "black";

export const STROKE_LINECAP = "square";

/**
 * The smallest `rows` value that still produces a valid, non-degenerate
 * motif for each type. `boxes`'s spiral traces `rows - 1` grid levels
 * inward; below 3 rows the first move collapses to a zero-length segment.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderType, number> = {
  boxes: 3,
};
