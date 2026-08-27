// 🏷️ Types

/**
 * One column-and-level-range run of a `mosaic` zigzag, produced by
 * {@link MotifTransformsService.alternate}: `column` is `0` for a repeat
 * unit's own column and `1` for its neighbor.
 */
export interface AlternateRun extends MotifLevelSpan {
  readonly column: 0 | 1;
}

/**
 * Which line a `mirror` transform reflects a point sequence across, both
 * running through the sequence's own center point: `"horizontal"` reflects
 * over a horizontal line (an up/down flip, negating the y distance from
 * center), `"vertical"` reflects over a vertical line (a left/right flip,
 * negating the x distance from center).
 */
export type MirrorAxis = "horizontal" | "vertical";

/** A point in the transforms layer expressed as `[xLevel, yLevel]` grid levels, not yet converted to pixel coordinates. */
export type MotifLevelPoint = readonly [number, number];

/**
 * A stretch of one column, in grid levels rather than pixels. `fromLevel`
 * equal to `toLevel` is a legal, zero-length span: `stroke-linecap="square"`
 * renders it as a small square mark rather than nothing.
 */
export interface MotifLevelSpan {
  readonly fromLevel: number;
  readonly toLevel: number;
}
