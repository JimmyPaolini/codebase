// 🏷️ Types

/** Mutable in-progress bounds of the inward spiral `boxes` traces, in grid levels rather than pixels. */
export interface BoxesSpiralBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

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
export type MeanderType = "boxes" | "chain" | "snake";

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
  | { readonly name: "spin" }
  | { readonly name: "spin-flip" };

/**
 * The per-type contract `MeanderGenerationService` dispatches through:
 * every type draws its repeat units with `path` and reports how far right
 * the last one extends with `rightEdge`. `border` is optional because only
 * `boxes` draws a single shared border path across the whole pattern —
 * `chain` and `snake` draw their own top/bottom border segment as part of
 * each unit's own `path` instead.
 */
export interface MotifService {
  border?(geometry: GridGeometry, rows: number, repeatCount: number): string;
  path(geometry: GridGeometry, unit: MotifUnit): string;
  rightEdge(geometry: GridGeometry, rows: number, repeatCount: number): number;
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

/** A spiral point expressed as `[xLevel, yLevel]` grid levels, not yet converted to pixel coordinates. */
export type SpiralLevelPoint = readonly [number, number];
