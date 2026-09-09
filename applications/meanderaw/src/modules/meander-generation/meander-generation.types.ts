// 🏷️ Types

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type { MosaicBuildableSubFamily } from "../mosaic-tile/mosaic-tile.types";

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
  readonly subFamily?: MosaicBuildableSubFamily;
  readonly type: MeanderType;
}

/**
 * A meander's family.
 *
 * Nine of them draw their repeat unit through a {@link MotifService} — see
 * {@link MotifDrawnType}. `mosaic` draws no unit of its own: every drawing
 * it has is a member of its enumerated unit space, addressed by naming that
 * member rather than by constructing one. See {@link TileDrawnType}.
 */
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
  | { readonly branches: number; readonly name: "stagger" }
  | {
      readonly flip?: SerpentineFlip;
      readonly name: "serpentine";
      readonly offset?: number;
      readonly strands: number;
    }
  | { readonly isLeftward: boolean; readonly name: "rung" }
  | { readonly name: "aligned"; readonly strands: number }
  | { readonly name: "brick-staggered" }
  | { readonly name: "brick-straight" }
  | { readonly name: "brick-upright" }
  | { readonly name: "edge" }
  | { readonly name: "edge-flip" }
  | { readonly name: "flip" }
  | { readonly name: "grid" }
  | { readonly name: "interrupted" }
  | { readonly name: "plied"; readonly strands: number }
  | { readonly name: "ruled" }
  | { readonly name: "ruled-closed" }
  | { readonly name: "ruled-raised" }
  | { readonly name: "ruled-spaced" }
  | { readonly name: "ruled-tall" }
  | { readonly name: "spin" }
  | { readonly name: "spin-flip" };

/**
 * A family whose repeat unit is drawn by a {@link MotifService}, which is
 * every family but the tile-drawn ones.
 *
 * Written as an exclusion rather than a list so that adding a family to
 * {@link MeanderType} makes it motif-drawn by default, and so
 * `MotifRegistryService`'s dispatch stays total over exactly the families
 * that have a motif service. `TILE_DRAWN_TYPES` is this type's runtime
 * counterpart, read where a family has to be sorted at run time rather than
 * narrowed at compile time.
 */
export type MotifDrawnType = Exclude<MeanderType, TileDrawnType>;

/**
 * The family, row count, and optional modifier one repeat unit's own column
 * span is derived from.
 *
 * It is {@link RepeatPatternOptions} without the repeat count, and the
 * omission is the point: a pitch is what a repeat count multiplies rather
 * than something a repeat count changes. `MotifPitchService` recovers it by
 * asking a motif service for two counts and subtracting, so a count named
 * here would be a probe rather than a parameter.
 */
export interface MotifPitchOptions {
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly type: MotifDrawnType;
}

/**
 * The per-type contract `MeanderGenerationService` dispatches through:
 * every type draws its repeat units with `path` and reports how far right
 * the last one extends with `rightEdge`. `border` is optional because only
 * `boxes`, `branch`, and `parallel` draw a single shared border path across
 * the whole pattern — `chain` and `snake` draw their own top/bottom border
 * segment as part of each unit's own `path` instead.
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
 * following unit to fill the gap. That is `swirl` and `whirl`
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
 * A family whose drawings are members of an enumerated unit space rather
 * than repeat units a motif service constructs.
 *
 * `mosaic` alone, and the distinction is what that family *is* rather than
 * an implementation detail of it: a tile's direction bits denote exactly one
 * drawing, so every mosaic there is already sits in the space the sweep
 * enumerates, and a modifier constructing one more would be constructing a
 * member the space already holds. It is addressed by naming a member —
 * `--sub-family` at the command line, a canonical identifier in the
 * corpus — which is why {@link MeanderGenerationService} refuses a
 * tile-drawn family with no `subFamily` instead of dispatching to a motif
 * service it has none of.
 */
export type TileDrawnType = "mosaic";

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
