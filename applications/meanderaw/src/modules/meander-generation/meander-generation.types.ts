// 🏷️ Types

/** Mutable in-progress bounds of the inward spiral `boxes` traces, in grid levels rather than pixels. */
export interface BoxesSpiralBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/** Which repeat unit `BoxesMotifService.path` draws and the modifier (if any) applied to it. */
export interface BoxesUnit {
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly unitIndex: number;
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
export type MeanderType = "boxes";

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

/** Every field here is already formatted for direct interpolation into SVG markup. */
export interface RenderOptions {
  readonly height: string;
  readonly paths: readonly string[];
  readonly strokeWidth: string;
  readonly width: string;
}

/** A spiral point expressed as `[xLevel, yLevel]` grid levels, not yet converted to pixel coordinates. */
export type SpiralLevelPoint = readonly [number, number];
