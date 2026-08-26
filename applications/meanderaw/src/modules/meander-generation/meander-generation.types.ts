// 🏷️ Types

/**
 * One column-and-level-range run of a `bars` zigzag, produced by
 * {@link MotifTransformsService.alternate}: `column` is `0` for a repeat
 * unit's own column and `1` for its neighbor.
 */
export interface AlternateRun extends MotifLevelSpan {
  readonly column: 0 | 1;
}

/** Mutable in-progress bounds of the inward spiral `boxes` traces, in grid levels rather than pixels. */
export interface BoxesSpiralBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/**
 * Which shape `bars`'s `dot` modifier's per-phase level sequence follows:
 * `"bounce"` mirrors back up before repeating (a triangle wave), `"up"`
 * steps straight down through every level once per period, then resets (a
 * staircase). See {@link MotifTransformsService.dotLevels}.
 */
export type DotShape = "bounce" | "up";

/** The type, rows, repeat count, and optional modifier needed to generate one meander. */
export interface GenerationParameters {
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
  readonly type: MeanderType;
}

/** The derived grid unit, offset, and stroke width every motif is drawn against. */
export interface GridGeometry {
  readonly height: number;
  readonly offset: number;
  readonly strokeWidth: number;
  readonly unit: number;
}

/** A meander's base repeating motif shape. */
export type MeanderType =
  | "bars"
  | "boxes"
  | "chain"
  | "snake"
  | "swirl"
  | "whirl";

/**
 * Which line a `mirror` transform reflects a point sequence across, both
 * running through the sequence's own center point: `"horizontal"` reflects
 * over a horizontal line (an up/down flip, negating the y distance from
 * center), `"vertical"` reflects over a vertical line (a left/right flip,
 * negating the x distance from center).
 */
export type MirrorAxis = "horizontal" | "vertical";

/**
 * A named, composable adjustment applied to a meander's repeating motif.
 * Only add a union member in the task that implements it — an unimplemented
 * member would be dead code no `COMPATIBLE_MODIFIERS` entry could point to.
 */
export type Modifier =
  | { readonly name: "alternated"; readonly period: number }
  | { readonly name: "dot"; readonly shape: DotShape }
  | { readonly name: "edge" }
  | { readonly name: "edge-flip" }
  | { readonly name: "flip" }
  | { readonly name: "spin" }
  | { readonly name: "spin-flip" }
  | { readonly name: "split" };

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

/**
 * The per-type contract `MeanderGenerationService` dispatches through:
 * every type draws its repeat units with `path` and reports how far right
 * the last one extends with `rightEdge`. `border` is optional because only
 * `boxes` draws a single shared border path across the whole pattern —
 * `chain` and `snake` draw their own top/bottom border segment as part of
 * each unit's own `path` instead.
 */
export interface MotifService {
  border?(geometry: GridGeometry, pattern: RepeatPatternOptions): string;
  path(geometry: GridGeometry, unit: MotifUnit): string;
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number;
}

/** Which repeat unit a motif service's `path` draws and the modifier (if any) applied to it. */
export interface MotifUnit {
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly unitIndex: number;
}

/** Every field here is already formatted for direct interpolation into SVG markup. */
export interface RenderOptions {
  readonly height: string;
  readonly paths: readonly string[];
  readonly strokeWidth: string;
  readonly width: string;
}

/** The row count, repeat count, and optional modifier a whole pattern's shared geometry (right edge, border) is computed from. */
export interface RepeatPatternOptions {
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
}

/** The row count, optional modifier, and horizontal offset one repeat unit's own border segment is drawn against. */
export interface UnitBorderOptions {
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly xOffset: number;
}
