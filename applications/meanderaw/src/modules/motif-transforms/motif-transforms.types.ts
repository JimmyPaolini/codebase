// 🏷️ Types

/**
 * Which line a `mirror`
 transform reflects a point sequence across, both
 * running through the sequence's own center point: `"horizontal"` reflects
 * over a horizontal line (an up/down flip, negating the y distance from
 * center), `"vertical"` reflects over a vertical line (a left/right flip,
 * negating the x distance from center).
 */
export type MirrorAxis = "horizontal" | "vertical";

/** A point in the transforms layer expressed as `[xLevel, yLevel]` grid levels, not yet converted to pixel coordinates. */
export type MotifLevelPoint = readonly [number, number];
