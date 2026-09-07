// ♟️ Constants

import {
  MOSAIC_TILE_MAXIMUM_ROWS,
  MOSAIC_TILE_MINIMUM_ROWS,
} from "../mosaic-tile/mosaic-tile.constants";

import type {
  MeanderType,
  Modifier,
  TileDrawnType,
} from "./meander-generation.types";

/**
 * Which modifier `name`s each type accepts. `MeanderGenerationService.generate`
 * rejects any `parameters.modifier` whose `name` isn't listed for
 * `parameters.type`.
 *
 * `mosaic`'s list is empty because a modifier constructs a repeat unit, and
 * every repeat unit that family has is already in the space
 * `MosaicTilesService` enumerates: 19 of the 24 drawings `alternated`,
 * `dot`, and `split` produced were tiles it already commits. See
 * {@link TILE_DRAWN_TYPES}.
 */

export const COMPATIBLE_MODIFIERS: Record<MeanderType, readonly string[]> = {
  boxes: ["spin", "spin-flip"],
  branch: ["rung", "stagger"],
  chain: ["edge", "flip", "edge-flip"],
  cross: ["interrupted"],
  mosaic: [],

  negative: [
    "brick-staggered",
    "brick-straight",
    "brick-upright",
    "grid",
    "ruled",
    "ruled-closed",
    "ruled-raised",
    "ruled-spaced",
    "ruled-tall",
  ],
  parallel: ["plied", "aligned", "serpentine"],
  snake: ["edge", "flip", "edge-flip"],
  swirl: ["flip"],
  whirl: ["flip"],
};

/** Directory a drawing is written to
 when the caller doesn't override it, shared by `draw`'s sweep and its single-drawing mode alike. */
export const DEFAULT_OUTPUT_DIRECTORY = "output";

/**
 * `repeatCount` a generated meander uses when the caller doesn't override it,
 * shared by `draw`'s single-drawing mode and its sweep so a hand-named file
 * and a swept file for the same type/rows/modifier are identical.
 */
export const DEFAULT_REPEAT_COUNT = 6;

/** Highest `rows` or `repeatCount` value the CLI accepts for any type. */
export const MAXIMUM_VALUE = 12;

/**
 * Highest `rows` value each family is drawn at, read by both
 * `MeanderGenerationService.generate` and `DrawCombinationsService` — which
 * keeps every drawing the command line accepts one this repository commits
 * and the charter gates, the property issue #507 lived in the absence of.
 * Nine families sit at the shared {@link MAXIMUM_VALUE}; only `mosaic` is
 * lower, and {@link MOSAIC_TILE_MAXIMUM_ROWS} carries the counts and why.
 */
export const FAMILY_MAXIMUM_ROWS: Record<MeanderType, number> = {
  boxes: MAXIMUM_VALUE,
  branch: MAXIMUM_VALUE,
  chain: MAXIMUM_VALUE,
  cross: MAXIMUM_VALUE,
  mosaic: MOSAIC_TILE_MAXIMUM_ROWS,
  negative: MAXIMUM_VALUE,
  parallel: MAXIMUM_VALUE,
  snake: MAXIMUM_VALUE,
  swirl: MAXIMUM_VALUE,
  whirl: MAXIMUM_VALUE,
};

/** Lowest `repeatCount` value the CLI accepts: at least one unit must be drawn. */
export const MINIMUM_REPEAT_COUNT = 1;

/**
 * Lowest `strands` value `plied` accepts.
 *
 * One, not two. Two was the original floor, on the argument that a family
 * named for strands running alongside one another needs two of them to have
 * one. That argument is about the family's *name*, not about its geometry,
 * and it was the only thing standing between the corpus and a whole end of
 * this family's range: a single-strand ply is one bracket per repeat unit,
 * two lattice columns wide, and it is a perfectly good drawing. It covers
 * both its columns to the full height of the band, so it is space-filling on
 * the same argument every deeper ply is; its lattice points carry two arms
 * of ink or one, so it branches and crosses exactly as much as the rest of
 * the family does, which is not at all. `parallel-motif.service.unit.test.ts`
 * measures all of that at one strand, and the charter sweep gates it
 * alongside every other ply.
 *
 * What one ply gives up is the *nesting*, not the validity — which is the
 * point of admitting it. It is the shallow end of the same axis
 * {@link DEFAULT_PARALLEL_STRANDS} sits two steps up, and a range with no
 * bottom step is a range the sweep cannot show the shape of.
 *
 * The upper bound is not a constant: it is the drawing's own `rows`, because
 * the innermost strand's arms are `rows - strands + 1` lattice steps long
 * and vanish beyond it.
 */
export const MINIMUM_STRANDS = 1;

/**
 * Every modifier that carries a `strands` count, and so is bounded by
 * {@link MINIMUM_STRANDS} and the drawing's own row count.
 *
 * All three belong to `parallel`, and all three name the same axis: how many
 * strands run alongside one another. They differ in what those strands
 * *trace* — `plied` nests brackets that flip with every repeat unit,
 * `aligned` nests the same brackets without flipping them, and `serpentine`
 * stacks continuous square-wave ribbons — not in how many of them there are.
 * Validation is a property of the count, so it is written once against this
 * list rather than three times against three names.
 */
export const PLY_MODIFIER_NAMES: readonly Modifier["name"][] = [
  "aligned",
  "plied",
  "serpentine",
];

/**
 * How many repeat units `spin` and `spin-flip` need before their 90° rotation
 * returns to its starting orientation. `repeatCount` must be a whole multiple
 * of this so the cycle never ends partway through.
 */
export const SPIN_CYCLE_LENGTH = 4;

/** Modifier names whose rotation cycle `repeatCount` must divide evenly. */
export const SPIN_FAMILY_MODIFIER_NAMES: readonly Modifier["name"][] = [
  "spin",
  "spin-flip",
];

/**
 * Every implemented modifier `name`, mirroring `SUPPORTED_TYPES`'s widened
 * `readonly string[]` declaration for the same reason: it keeps
 * `Array.prototype.includes` usable with a plain `string` at the CLI
 * boundary, with the `satisfies` check below as the only place a typo could
 * surface.
 */
export const SUPPORTED_MODIFIER_NAMES: readonly string[] = [
  "spin",
  "spin-flip",
  "edge",
  "flip",
  "edge-flip",
  "interrupted",
  "brick-staggered",
  "brick-straight",
  "brick-upright",
  "grid",
  "ruled",
  "ruled-closed",
  "ruled-raised",
  "ruled-spaced",
  "ruled-tall",
  "rung",
  "stagger",
  "plied",
  "aligned",
  "serpentine",
] satisfies readonly Modifier["name"][];

/**
 * Every implemented meander type, declared `readonly string[]` rather than a
 * literal tuple for the same reason as {@link SUPPORTED_MODIFIER_NAMES}: it
 * keeps `Array.prototype.includes` usable with a plain `string` at the CLI
 * boundary, with the `satisfies` check below as the only place a typo could
 * surface.
 *
 * **The order is load-bearing, and it is a reading order rather than an
 * alphabetical or a historical one.** It runs from the families whose motif is
 * a single line — `snake` through `boxes` — into the four that break one of
 * the charter's negotiable invariants, and ends at `mosaic`, whose enumerated
 * tiles outnumber every other family put together, and which is drawn from
 * that enumeration alone. It is the order the `--type`

 * help text lists, the order the sweep generates in, and the order
 * `DrawIndexService` lays the index page out in, so a family moved here moves
 * in all three at once.
 */
export const SUPPORTED_TYPES: readonly string[] = [
  "snake",
  "chain",
  "swirl",
  "whirl",
  "boxes",
  "branch",
  "cross",
  "parallel",
  "negative",
  "mosaic",
] satisfies readonly MeanderType[];

/**
 * The smallest `rows` value that still produces a valid, non-degenerate
 * motif for each type. `boxes`'s spiral traces
 * `rows - 1` grid levels inward; below 3 rows the first move collapses to a
 * zero-length segment. `chain` and `snake` share a zigzag that needs a
 * genuine middle row distinct from its two neighbors; below 4 rows the
 * sequence degenerates (no reference file exists below 4 rows for either
 * type). `swirl` and `whirl` are both nested spirals verified against
 * reference files starting at 4 rows; nothing below that has been checked
 * against real geometry.
 *
 * `mosaic`'s entry is {@link MOSAIC_TILE_MINIMUM_ROWS} and nothing here
 * reads it: that family draws no motif — see {@link TILE_DRAWN_TYPES} — so
 * `MosaicTileGenerationService` validates a tile's rows against those same
 * constants. Stated anyway, because this record is total over
 * {@link MeanderType}.
 *


 * `cross`'s minimum of 6 is set by its `interrupted` modifier rather than by
 * its solid shape, which would draw down to 4 rows. The break gives up the
 * grid level either side of the crossing, and the crossing sits at
 * `floor(rows / 2)`, so below 6 rows the *upper* remnant has no whole level
 * left and collapses to a zero-length run — a square line cap and nothing
 * else, a dot one stroke wide rather than a length of strand. At 4 rows both
 * remnants collapse. The pair stops reading as one strand passing under
 * another, which is the whole point of the mode.
 *
 * Nothing measures that, and the minimum is the only thing standing in its
 * way: at 4 and 5 rows the drawing is still fully space-filling —
 * `channelWidthCompliant` stays true, because a collapsed run still paints
 * its own lattice point and the unit's top connector paints level 1 in any
 * case. This is a legibility floor, not a topology one, and
 * `cross-motif.service.unit.test.ts` pins both halves of that at 4, 5, and 6
 * rows so the number and its reason cannot drift apart. One minimum per
 * family is the model here, so the family takes the stricter of its two
 * modes.
 *
 * `negative`'s minimum is **3**, and the link to
 * `MOSAIC_TILE_MINIMUM_ROWS - NEGATIVE_SOURCE_ROW_OFFSET` is cut
 * deliberately. That subtraction meant "the shallowest negative the
 * shallowest enumerable tile can yield", which held while `mosaic`'s minimum
 * moved for reasons about what a tile is. It now moves for reasons about how
 * large a space is worth enumerating, which says nothing about how shallow a
 * band this family can ink the corridors of — so following it down would
 * widen `negative` as a side effect of a decision about another family.
 *
 * `branch`'s minimum of 2 is its `rung` mode's, and the family takes the
 * stricter of its modes the same way `cross` does. `comb` and `stagger` do
 * draw at one row — a rail with a one-step tooth under every column still
 * forks at every interior column, 10 times and 5 times respectively, which
 * is what they fork at every other row count too. `rung` does not. Its fork
 * is a rung meeting the middle of a stile, so it needs the stile to have a
 * middle — at least one lattice point strictly between the band's two
 * border rows — and a one-row band has none, leaving each unit a plain
 * bracket with the mode's characteristic junction absent entirely. The
 * `rows - 1` stile forks per unit that the mode is named for appear first
 * at 2 rows. `branch-motif.service.unit.test.ts` renders all three modes
 * below the minimum and measures every claim in this paragraph there, so
 * the number and its reason cannot drift apart.
 *
 * `parallel`'s minimum is **2**, and it is the shallowest band that admits
 * more than one strand rather than anything about a ply's arms.
 *
 * It used to be 4, on an argument that no longer exists. The sweep applied
 * one flat list of plies to every row count alike, so the list's deepest
 * entry had to be shallow enough for the shallowest row count to accept —
 * and that entry was 4, which this number was pinned to.
 * `DrawCombinationsService.strandCounts` asks per row now, so a ply deeper
 * than the band is never enumerated and the pin is gone.
 *
 * What sets 2 is the family's own axis. `strands` is bounded above by the
 * drawing's `rows`, so a one-row band admits a single ply and nothing else:
 * the ply axis collapses to one value, and a family whose whole claim is
 * `N` strands running alongside one another has no room to put a second one
 * beside the first. Two rows is where that stops being true. It is a floor
 * on the *family*, not on any one drawing — `parallel-motif.service.unit.test.ts`
 * renders a one-row band through the motif service and measures it holding
 * every charter invariant, the same way `branch` measures its own modes
 * below its minimum, so the number and its reason cannot drift apart.
 *
 * A ply deeper than the row count is refused by
 * {@link InvalidStrandCountError} rather than by this number, which is why
 * the bound on `strands` is `rows` and not a constant.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderType, number> = {
  boxes: 3,
  branch: 2,
  chain: 4,
  cross: 6,
  mosaic: MOSAIC_TILE_MINIMUM_ROWS,
  negative: 3,
  parallel: 2,
  snake: 4,
  swirl: 4,
  whirl: 4,
};

// 🚨 Errors

/** Thrown when a modifier's `name` isn't listed as compatible with the requested type. */
export class InvalidModifierError extends Error {
  constructor(
    modifierName: string,
    type: string,
    compatibleModifierNames: readonly string[],
  ) {
    super(
      `modifier "${modifierName}" is not compatible with type "${type}"; compatible modifiers: ${
        compatibleModifierNames.length > 0
          ? compatibleModifierNames.join(", ")
          : "none"
      }`,
    );
    this.name = "InvalidModifierError";
  }
}

/**
 * Thrown when `serpentine`'s `offset` falls outside its own strand count.
 *
 * The bound is the strand count rather than a constant because the offset
 * rotates a cyclic sequence of exactly that length — rotating `strands`
 * places is rotating none — so the message names the count it was measured
 * against rather than a number written here.
 */
export class InvalidOffsetError extends Error {
  constructor(offset: number, strands: number) {
    super(
      `offset must be between 0 and the strand count ${strands} exclusive, received ${offset}`,
    );
    this.name = "InvalidOffsetError";
  }
}

/** Thrown when `repeatCount` isn't a whole multiple of a modifier's rotation cycle length. */
export class InvalidRepeatCountCycleError extends Error {
  constructor(repeatCount: number, cycleLength: number, modifierName: string) {
    super(
      `repeatCount must be a multiple of ${cycleLength} for modifier "${modifierName}", received ${repeatCount}`,
    );
    this.name = "InvalidRepeatCountCycleError";
  }
}

/** Thrown when `repeatCount` falls outside the shared minimum and maximum. */
export class InvalidRepeatCountError extends Error {
  constructor(repeatCount: number, minimum: number, maximum: number) {
    super(
      `repeatCount must be between ${minimum} and ${maximum}, received ${repeatCount}`,
    );
    this.name = "InvalidRepeatCountError";
  }
}

/** Thrown when `rows` falls outside a type's structural minimum or the shared maximum. */
export class InvalidRowsError extends Error {
  constructor(rows: number, minimum: number, maximum: number) {
    super(`rows must be between ${minimum} and ${maximum}, received ${rows}`);
    this.name = "InvalidRowsError";
  }
}

/**
 * Thrown when `stagger`'s `branches` falls outside
 * {@link MINIMUM_STAGGER_BRANCHES} and the shared {@link MAXIMUM_VALUE}.
 *
 * The minimum is the family's own and the maximum is the command line's,
 * which is why the message names them rather than restating either: below
 * the minimum the mode stops forking altogether, and above the maximum
 * nothing structural fails — a crenel simply grows wider than any other
 * parameter this application accepts.
 */
export class InvalidStaggerBranchCountError extends Error {
  constructor(branches: number, minimum: number, maximum: number) {
    super(
      `branches must be between ${minimum} and ${maximum}, received ${branches}`,
    );
    this.name = "InvalidStaggerBranchCountError";
  }
}

/**
 * Thrown when `plied`'s `strands` falls outside {@link MINIMUM_STRANDS} and
 * the drawing's own row count.
 *
 * The maximum is `rows` rather than {@link MAXIMUM_VALUE} because the bound
 * is the geometry's, not the CLI's: a bundle's innermost strand has
 * `rows - strands + 1` lattice steps of arm, and at one ply further it has
 * none. That is also why the message names the row count it was measured
 * against rather than a constant.
 */
export class InvalidStrandCountError extends Error {
  constructor(strands: number, minimum: number, rows: number) {
    super(
      `strands must be between ${minimum} and the row count ${rows}, received ${strands}`,
    );
    this.name = "InvalidStrandCountError";
  }
}

/**
 * Types whose unmodified drawing one of their own modifiers already names,
 * so the sweep draws it once under that name rather than twice under two.
 *
 * `parallel` is the only one. Drawn with no modifier it is a two-strand
 * `plied` bundle, and `plied` naming two strands renders the same bytes —
 * which used to reach disk as `plain-…svg` while every sibling drawing was
 * named for its ply. The sweep now omits the unmodified entry for this type
 * and lets `plied` cover it, so the whole family is named on one scheme and
 * a reader can tell two drawings apart by their filenames alone.
 *
 * Nothing is lost from the corpus by it: the two documents were always
 * identical, and the command line still accepts `--type parallel` with no
 * modifier.
 */
export const TYPES_WITH_MODIFIER_NAMED_DEFAULT: readonly MeanderType[] = [
  "parallel",
];

/**
 * Families drawn from an enumerated unit space rather than by a motif
 * service — the runtime half of {@link TileDrawnType}, read by the three
 * places that would otherwise each carry the same exception:
 * `MeanderGenerationService.generate` refuses one with no `subFamily`,
 * having no motif to dispatch to; `DrawCombinationsService.enumerate`
 * leaves them out of the named-type sweep, a family with neither modifier
 * nor motif having no combination to contribute; and
 * `MotifRegistryService` holds no entry, which {@link MotifDrawnType} makes
 * a type error rather than a lookup answering `undefined`. Widened to
 * `readonly string[]` for {@link SUPPORTED_TYPES}'s reason.
 */

export const TILE_DRAWN_TYPES: readonly string[] = [
  "mosaic",
] satisfies readonly TileDrawnType[];
