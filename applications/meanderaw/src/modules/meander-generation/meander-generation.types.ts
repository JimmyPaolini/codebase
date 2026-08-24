// 🏷️ Types

/** Mutable in-progress bounds of the inward spiral `boxes` traces, in grid levels rather than pixels. */
export interface BoxesSpiralBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/** The type, rows, and repeat count needed to generate one meander. */
export interface GenerationParameters {
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

/** Every field here is already formatted for direct interpolation into SVG markup. */
export interface RenderOptions {
  readonly height: string;
  readonly paths: readonly string[];
  readonly strokeWidth: string;
  readonly width: string;
}

/** A spiral point expressed as `[xLevel, yLevel]` grid levels, not yet converted to pixel coordinates. */
export type SpiralLevelPoint = readonly [number, number];
