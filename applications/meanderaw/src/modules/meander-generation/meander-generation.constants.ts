// ♟️ Constants

import { SUPPORTED_SUB_FAMILIES } from "../mosaic-motif/mosaic-motif.constants";

import type {
  DotShape,
  MeanderType,
  Modifier,
} from "./meander-generation.types";

/**
 * Which modifier `name`s each type accepts. `MeanderGenerationService.generate`
 * rejects any `parameters.modifier` whose `name` isn't listed for
 * `parameters.type`.
 */
export const COMPATIBLE_MODIFIERS: Record<MeanderType, readonly string[]> = {
  boxes: ["spin", "spin-flip"],
  chain: ["edge", "flip", "edge-flip"],
  cross: ["interrupted"],
  mosaic: ["alternated", "dot", "split"],
  negative: ["brick", "ruled"],
  snake: ["edge", "flip", "edge-flip"],
  swirl: ["flip"],
  whirl: ["flip"],
};

/**
 * The smallest `rows` value at which `mosaic`'s `dot` modifier draws a dot at
 * all. The dot interrupts two whole grid levels of the bar — one either side
 * of its own level — so the bar needs at least two levels to give up, and it
 * spans only `rows - 2`. At 3 rows the bar is a single grid level and there
 * is no room, so `dot` falls through to the unmodified bar, the same way
 * `split` already degenerates there (see {@link STRUCTURAL_MINIMUM_ROWS}).
 */
export const DOT_MINIMUM_ROWS = 4;

/** Directory a generated meander is written to when the caller doesn't override it, shared by both `generate` and `generate-batch`. */
export const DEFAULT_OUTPUT_DIRECTORY = "output";

/**
 * `repeatCount` a generated meander uses when the caller doesn't override it,
 * shared by both `generate` and `generate-batch` so a single-pattern file and
 * a batch-swept file for the same type/rows/modifier are identical.
 */
export const DEFAULT_REPEAT_COUNT = 6;

/** Highest `rows` or `repeatCount` value the CLI accepts for any type. */
export const MAXIMUM_VALUE = 12;

/** Lowest `period` value `alternated` accepts: a run must span at least one grid level. */
export const MINIMUM_PERIOD = 1;

/** Lowest `repeatCount` value the CLI accepts: at least one unit must be drawn. */
export const MINIMUM_REPEAT_COUNT = 1;

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

/** Every shape `mosaic`'s `dot` modifier accepts, mirroring `SUPPORTED_MODIFIER_NAMES`'s widened declaration for the same reason. */
export const SUPPORTED_DOT_SHAPES: readonly string[] = [
  "bounce",
  "up",
] satisfies readonly DotShape[];

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
  "alternated",
  "split",
  "dot",
  "interrupted",
  "brick",
  "ruled",
] satisfies readonly Modifier["name"][];

/**
 * Every implemented meander type, declared `readonly string[]` rather than a
 * literal tuple for the same reason as {@link SUPPORTED_MODIFIER_NAMES}: it
 * keeps `Array.prototype.includes` usable with a plain `string` at the CLI
 * boundary, with the `satisfies` check below as the only place a typo could
 * surface.
 */
export const SUPPORTED_TYPES: readonly string[] = [
  "mosaic",
  "boxes",
  "chain",
  "snake",
  "swirl",
  "whirl",
  "cross",
  "negative",
] satisfies readonly MeanderType[];

/**
 * Which sub-family names each type admits. A sub-family is a named
 * predicate over a family's unit space, so a family whose unit space is
 * latent rather than materialized has none to admit — which today is every
 * family but `mosaic`. `MeanderGenerationService.generate` rejects any
 * `parameters.subFamily` not listed for `parameters.type`.
 */
export const SUB_FAMILIES: Record<MeanderType, readonly string[]> = {
  boxes: [],
  chain: [],
  cross: [],
  mosaic: SUPPORTED_SUB_FAMILIES,
  negative: [],
  snake: [],
  swirl: [],
  whirl: [],
};

/**
 * The smallest `rows` value that still produces a valid, non-degenerate
 * motif for each type. `mosaic`'s vertical bar spans grid levels 1 through
 * `rows - 1`; below 3 rows those two levels collapse to the same level and
 * the bar disappears, leaving only the two caps. `boxes`'s spiral traces
 * `rows - 1` grid levels inward; below 3 rows the first move collapses to a
 * zero-length segment. `chain` and `snake` share a zigzag that needs a
 * genuine middle row distinct from its two neighbors; below 4 rows the
 * sequence degenerates (no reference file exists below 4 rows for either
 * type). `swirl` and `whirl` are both nested spirals verified against
 * reference files starting at 4 rows; nothing below that has been checked
 * against real geometry.
 *
 * `mosaic`'s minimum of 3 is a floor for the unmodified bar shape only: at
 * exactly 3 rows the bar spans a single grid unit, so the `split` modifier
 * degenerates to a no-op there — it has nothing left to split, and its
 * output is byte-identical to the unmodified bar.
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
 * `negative`'s minimum of 3 is its source's minimum of 4, moved down one.
 * It inks the corridors a `mosaic` tile leaves, and puts a lattice point on
 * each of that tile's cells — so its own band is one row shorter than the
 * tile it inverts (see `NEGATIVE_SOURCE_ROW_OFFSET`), and 3 rows is the
 * shallowest negative the shallowest enumerated tile can yield.
 * `MOSAIC_TILE_MINIMUM_ROWS` is 4 for its own reason — below it a tile's
 * interior is a single level and there is nothing to permute — so this
 * number is that one, and moves with it.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderType, number> = {
  boxes: 3,
  chain: 4,
  cross: 6,
  mosaic: 3,
  negative: 3,
  snake: 4,
  swirl: 4,
  whirl: 4,
};

// 🚨 Errors

/**
 * Thrown when a sub-family and a modifier are requested together. Both
 * decide which repeat unit is drawn — a modifier by constructing one, a
 * sub-family by naming a region of the units the family already generates —
 * so honoring one would mean silently discarding the other.
 */
export class ConflictingSubFamilyError extends Error {
  constructor(subFamily: string, modifierName: string) {
    super(
      `sub-family "${subFamily}" cannot be combined with modifier "${modifierName}"; a modifier constructs a repeat unit and a sub-family names one, so only one of them may choose it`,
    );
    this.name = "ConflictingSubFamilyError";
  }
}

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

/** Thrown when `alternated`'s `period` falls outside the shared bounds, or `repeatCount` isn't a whole multiple of it. */
export class InvalidPeriodError extends Error {
  constructor(period: number, minimum: number, maximum: number) {
    super(
      `period must be between ${minimum} and ${maximum}, received ${period}`,
    );
    this.name = "InvalidPeriodError";
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

/** Thrown when a sub-family isn't listed as one of the requested type's own, which for every type but `mosaic` means it has none. */
export class InvalidSubFamilyError extends Error {
  constructor(
    subFamily: string,
    type: string,
    subFamilyNames: readonly string[],
  ) {
    super(
      `sub-family "${subFamily}" is not a sub-family of type "${type}"; sub-families: ${
        subFamilyNames.length > 0 ? subFamilyNames.join(", ") : "none"
      }`,
    );
    this.name = "InvalidSubFamilyError";
  }
}

/**
 * Thrown when a sub-family names no tile at the requested row count. Only
 * `diamond` can hit this: its vertical dashes cover the bar's interior
 * levels in pairs, so an interior with an odd number of them cannot be
 * covered by vertical dashes alone.
 */
export class UnavailableSubFamilyError extends Error {
  constructor(subFamily: string, rows: number) {
    super(`sub-family "${subFamily}" has no tile at ${rows} rows`);
    this.name = "UnavailableSubFamilyError";
  }
}
