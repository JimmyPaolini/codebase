// ♟️ Constants

import type { MeanderType } from "./meander-generation.types";

/** Fixed canvas height every meander is drawn against, in grid units. */
export const CANVAS_HEIGHT = 60;

/** Highest `rows` or `repeatCount` value the CLI accepts for any type. */
export const MAXIMUM_VALUE = 12;

/** Lowest `repeatCount` value the CLI accepts: at least one unit must be drawn. */
export const MINIMUM_REPEAT_COUNT = 1;

export const STROKE_COLOR = "black";

export const STROKE_LINECAP = "square";

/**
 * Every implemented meander type, as the single source of truth `MeanderType`
 * is checked against. Declared `readonly string[]` rather than a literal
 * tuple — a tuple's narrow element type makes `Array.prototype.includes`
 * reject a plain `string` argument at compile time, forcing an unchecked
 * assertion at every call site; widening here instead keeps the one
 * `satisfies` check below as the only place a typo could surface.
 */
export const SUPPORTED_TYPES: readonly string[] = [
  "boxes",
] satisfies readonly MeanderType[];

/**
 * The smallest `rows` value that still produces a valid, non-degenerate
 * motif for each type. `boxes`'s spiral traces `rows - 1` grid levels
 * inward; below 3 rows the first move collapses to a zero-length segment.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderType, number> = {
  boxes: 3,
};
