// ♟️ Constants

import type {
  DotShape,
  MeanderType,
  Modifier,
} from "./meander-generation.types";

/** Fixed canvas height every meander is drawn against, in grid units. */
export const CANVAS_HEIGHT = 60;

/**
 * Which modifier `name`s each type accepts. `MeanderGenerationService.generate`
 * rejects any `parameters.modifier` whose `name` isn't listed for
 * `parameters.type`.
 */
export const COMPATIBLE_MODIFIERS: Record<MeanderType, readonly string[]> = {
  bars: ["alternated", "dot", "split"],
  boxes: ["spin", "spin-flip"],
  chain: ["edge", "flip", "edge-flip"],
  snake: ["edge", "flip", "edge-flip"],
  swirl: ["flip"],
  whirl: ["flip"],
};

/** Directory a generated meander is written to when the caller doesn't override it, shared by both `generate` and `generate-batch`. */
export const DEFAULT_OUTPUT_DIRECTORY = "output";

/**
 * `repeatCount` a generated meander uses when the caller doesn't override it,
 * shared by both `generate` and `generate-batch` so a single-pattern file and
 * a batch-swept file for the same type/rows/modifier are identical.
 */
export const DEFAULT_REPEAT_COUNT = 6;

/**
 * Modifier names whose "edge" behavior closes the motif flush against the
 * canvas border: the shared repeat pitch widens from `rows - 1` grid levels
 * to `rows` grid levels (see {@link MotifTransformsService.closeEdge}).
 */
export const EDGE_FAMILY_MODIFIER_NAMES: readonly Modifier["name"][] = [
  "edge",
  "edge-flip",
];

/**
 * Modifier names whose "flip" behavior mirrors alternating repeat units
 * (every odd `unitIndex`), rather than every unit like `spin-flip` does.
 * Bare `flip` is deliberately excluded: its mirrored twin is fused into
 * the SAME repeat unit (see
 * {@link SnakeSequenceService.unitPoints}'s `fusedFlipPoints`) rather than
 * alternating unit-by-unit, so every unit index looks identical once
 * translated — `edge-flip` is the only modifier that still alternates.
 */
export const FLIP_ALTERNATION_MODIFIER_NAMES: readonly Modifier["name"][] = [
  "edge-flip",
];

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

export const STROKE_COLOR = "black";

export const STROKE_LINECAP = "square";

/** Every shape `bars`'s `dot` modifier accepts, mirroring `SUPPORTED_MODIFIER_NAMES`'s widened declaration for the same reason. */
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
] satisfies readonly Modifier["name"][];

/**
 * Every implemented meander type, declared `readonly string[]` rather than a
 * literal tuple for the same reason as {@link SUPPORTED_MODIFIER_NAMES}: it
 * keeps `Array.prototype.includes` usable with a plain `string` at the CLI
 * boundary, with the `satisfies` check below as the only place a typo could
 * surface.
 */
export const SUPPORTED_TYPES: readonly string[] = [
  "bars",
  "boxes",
  "chain",
  "snake",
  "swirl",
  "whirl",
] satisfies readonly MeanderType[];

/**
 * The smallest `rows` value that still produces a valid, non-degenerate
 * motif for each type. `bars`'s vertical bar spans grid levels 1 through
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
 * `bars`'s minimum of 3 is a floor for the unmodified bar shape only: at
 * exactly 3 rows the bar spans a single grid unit, so the `split` modifier
 * degenerates to a no-op there — it has nothing left to split, and its
 * output is byte-identical to the unmodified bar.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderType, number> = {
  bars: 3,
  boxes: 3,
  chain: 4,
  snake: 4,
  swirl: 4,
  whirl: 4,
};
