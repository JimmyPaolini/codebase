// 🏷️ Types

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type { MosaicSubFamily } from "../mosaic-motif/mosaic-motif.types";

/**
 * Which shape `mosaic`'s `dot` modifier's per-phase level sequence follows:
 * `"bounce"` mirrors back up before repeating (a triangle wave), `"up"`
 * steps straight down through every level once per period, then resets (a
 * staircase). See {@link MotifTransformsService.dotLevels}.
 */
export type DotShape = "bounce" | "up";

/**
 * The type, rows, repeat count, and optional modifier or sub-family needed
 * to generate one meander. `modifier` and `subFamily` are two ways of
 * choosing the same thing — the repeat unit drawn — so asking for both is
 * rejected rather than resolved.
 */
export interface GenerationParameters {
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
  readonly subFamily?: MosaicSubFamily;
  readonly type: MeanderType;
}

/** A meander's base repeating motif shape. */
export type MeanderType =
  | "boxes"
  | "chain"
  | "cross"
  | "mosaic"
  | "snake"
  | "swirl"
  | "whirl";

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
  | { readonly name: "interrupted" }
  | { readonly name: "spin" }
  | { readonly name: "spin-flip" }
  | { readonly name: "split" };

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

/**
 * Which repeat unit a motif service's `path` draws and the modifier (if
 * any) applied to it. `isLastUnit` is what lets a type whose central motif
 * stops short of its own unit pitch clip the final unit's border flush with
 * that motif, instead of trailing a stub off the end of the pattern with no
 * following unit to fill the gap. That is `mosaic`, `swirl`, and `whirl`
 * always, and `snake` and `chain` under the `edge` family, whose widened
 * pitch reaches a level past their zigzag.
 */
export interface MotifUnit {
  readonly isLastUnit: boolean;
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly unitIndex: number;
}

/** The row count, repeat count, and optional modifier a whole pattern's shared geometry (right edge, border) is computed from. */
export interface RepeatPatternOptions {
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
}

/**
 * The row count, optional modifier, and horizontal offset one repeat unit's
 * own border segment is drawn against. `isLastUnit` clips the segment flush
 * with the central motif's own rightmost point. Whether that changes the
 * segment depends on the type and modifier: it does wherever the motif
 * stops short of the unit pitch, and where the two already agree both
 * branches draw the same thing.
 */
export interface UnitBorderOptions {
  readonly isLastUnit: boolean;
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly xOffset: number;
}
