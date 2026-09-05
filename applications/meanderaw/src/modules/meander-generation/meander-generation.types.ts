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
  | "branch"
  | "chain"
  | "cross"
  | "mosaic"
  | "negative"
  | "parallel"
  | "snake"
  | "swirl"
  | "whirl";

/**
 * A named, composable adjustment applied to a meander's repeating motif.
 * Only add a union member in the task that implements it — an unimplemented
 * member would be dead code no `COMPATIBLE_MODIFIERS` entry could point to.
 */
export type Modifier =
  | {
      readonly flip?: SerpentineFlip;
      readonly name: "serpentine";
      readonly offset?: number;
      readonly strands: number;
    }
  | { readonly name: "aligned"; readonly strands: number }
  | { readonly name: "alternated"; readonly period: number }
  | { readonly name: "brick" }
  | { readonly name: "dot"; readonly shape: DotShape }
  | { readonly name: "edge" }
  | { readonly name: "edge-flip" }
  | { readonly name: "flip" }
  | { readonly name: "interrupted" }
  | { readonly name: "plied"; readonly strands: number }
  | { readonly name: "ruled" }
  | { readonly name: "rung" }
  | { readonly name: "spin" }
  | { readonly name: "spin-flip" }
  | { readonly name: "split" }
  | { readonly name: "stagger" };

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

/**
 * The name of a modifier that carries a `strands` count.
 *
 * Derived from {@link Modifier} rather than written out, so a ply-carrying
 * member added to that union is a member of this the same day. The three it
 * names today all belong to `parallel` — see `PLY_MODIFIER_NAMES`, which is
 * this type's runtime half.
 */
export type PlyModifierName = Extract<
  Modifier,
  { readonly strands: number }
>["name"];

/** The row count, repeat count, and optional modifier a whole pattern's shared geometry (right edge, border) is computed from. */
export interface RepeatPatternOptions {
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
}

/**
 * Which ribbons a `serpentine` drawing turns upside down.
 *
 * `"alternating"` flips every other ribbon, so the stack interlocks;
 * `"one"` flips only the deepest ribbon however many there are. The two
 * agree at one and two strands and part company at three, which is why both
 * are swept rather than one standing in for the other. A drawing with no
 * `flip` at all leaves every ribbon waving in phase.
 */
export type SerpentineFlip = "alternating" | "one";

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
