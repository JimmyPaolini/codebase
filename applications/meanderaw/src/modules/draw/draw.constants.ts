// ♟️ Constants

import type { DotShape } from "../meander-generation/meander-generation.types";

/**
 * `period` values swept for the `alternated` modifier's batch combinations:
 * two representative points within the shared `MINIMUM_PERIOD`–`MAXIMUM_VALUE`
 * bounds (period 1 sits on the lower bound itself), distinct enough to show
 * the modifier actually varies with `period`
 * without sweeping the whole range. Period 1 leads the sweep because it's the
 * only period verified byte-exact against real reference files; period 3's
 * interior zigzag geometry, like every period above 1, is a hand-idealized
 * approximation (see `MosaicMotifService.alternatedPath`'s JSDoc).
 */
export const ALTERNATED_SWEEP_PERIODS: readonly number[] = [1, 3];

/**
 * `isUpward` values swept for the `comb` modifier's batch combinations.
 *
 * One value rather than two, and deliberately not the mode's own default:
 * the unmodified sweep already draws the downward comb, and
 * `--modifier comb` naming it produces a byte-identical document under a
 * second filename — `branch-motif.service.unit.test.ts` asserts that
 * identity, exactly as `parallel`'s does for a two-strand `plied`. Sweeping
 * the upward one alone is what puts the direction the corpus did not have
 * into it without putting the one it already had into it twice.
 *
 * `rung` sweeps both of its directions because neither is what the
 * unmodified drawing is — that one is a `comb`.
 */
export const COMB_SWEEP_UPWARD_VALUES: readonly boolean[] = [true];

/**
 * Every shape swept for the `dot` modifier's batch combinations. `DotShape`
 * only has two members, so this sweeps the type's full domain rather than a
 * sample of it.
 */
export const DOT_SWEEP_SHAPES: readonly DotShape[] = ["bounce", "up"];

/**
 * `isLeftward` values swept for the `rung` modifier's batch combinations.
 *
 * Both of them, which is the modifier's whole domain rather than a sample of
 * it — the same reason {@link DOT_SWEEP_SHAPES} sweeps two. `false` leads,
 * so the rightward drawing the sweep committed under the bare name before
 * the flag existed is still the first one enumerated at each row count.
 *
 * The two are mirror images and every topology count is identical across
 * them, so this pair adds no new measurement to the charter. It is swept
 * anyway because the corpus is what the index page shows, and a direction
 * nobody can see drawn is a direction nobody will use.
 */
export const RUNG_SWEEP_LEFTWARD_VALUES: readonly boolean[] = [false, true];

/**
 * `branches` values swept for the `stagger` modifier's batch combinations.
 *
 * A contiguous run rather than the sampled pairs `alternated` and `plied`
 * take, because this parameter has a floor they do not and every value
 * above it draws a visibly different crenel. The first is
 * `MINIMUM_STAGGER_BRANCHES` itself, which is both the tightest crenel the
 * mode admits and the only one any `stagger` was drawn at before the flag
 * existed; each one after it widens the crenel by a single lattice column,
 * so no value in the run repeats the one before it at another scale.
 *
 * It stops at six because a crenel keeps its shape and only its wavelength
 * grows: past six branches one rail run spans most of a six-repeat band and
 * the figure reads as a `comb` with a couple of changes of side rather than
 * as a crenellation. Nothing structural stops a wider one — the command
 * line accepts up to `MAXIMUM_VALUE` — so this is where the sweep stops
 * rather than where the mode does.
 */
export const STAGGER_SWEEP_BRANCH_COUNTS: readonly number[] = [3, 4, 5, 6];

/**

 * The gallery page `DrawCommand` writes at the root of the output directory,
 * listing every document the sweep produced under the directory it landed
 * in. One page rather than one per row count: the tiles are now separated by
 * directory on disk, so the page's only remaining job is to show them all in
 * one place.
 *
 * It links each drawing rather than inlining it, which is what lets a single
 * page carry the whole corpus without duplicating a byte of it — and it sits
 * inside the tree it indexes rather than beside it, so every one of those
 * links is a path down from the page's own directory and the pair moves as a
 * unit.
 */
export const INDEX_FILE_NAME = "index.html";

/**
 * How many columns the `negative` permutation half's source tiles span.
 *
 * One, and it is a definition rather than a budget. A one-column source has
 * no vertical mark for a second column to stagger against, so its negative
 * is rules broken only where the source opens a window — which is what the
 * `ruled` name means, and what makes this half that domain enumerated rather
 * than sampled. The two-column space is a different shape of pattern, not a
 * deeper cut of this one, and the three members of it this repository draws
 * are named in the sweep's other half.
 */
export const NEGATIVE_PERMUTATION_COLUMNS = 1;

/**
 * Subdirectory of a row count's own directory that the mosaic permutations
 * are written under, one column-span directory deep. They are nested rather
 * than left beside the named-type sweep because the enumeration runs to
 * thousands of files — the named-type sweep beside them is a reviewable
 * hundred.
 */
export const PERMUTATIONS_SUBDIRECTORY = "permutations";

/** `repeatCount` every swept mosaic is drawn at, wide enough to read the tile's rhythm without dominating the index page. */
export const PERMUTATION_REPEAT_COUNT = 6;

// 🚨 Errors

/**
 * Thrown when two combinations in the sweep would write the same path.
 *
 * The sweep is a cross product, so a naming convention that stopped
 * distinguishing two of its points would silently drop one drawing rather
 * than fail. This is what makes that a failure.
 */
export class CollidingPathsError extends Error {
  constructor() {
    super("Sweep produced colliding output paths");
    this.name = "CollidingPathsError";
  }
}

/**
 * Thrown when only one of `--type` and `--rows` is given.
 *
 * Neither flag can be `required`, because passing neither is how the whole
 * sweep is asked for — so the pair has to be checked rather than declared.
 */
export class IncompleteDrawingError extends Error {
  constructor() {
    super(
      "drawing one meander needs both --type and --rows; pass neither to sweep every meander instead",
    );
    this.name = "IncompleteDrawingError";
  }
}

/** Thrown when a modifier that carries a parameter is asked for without it. */
export class MissingModifierParameterError extends Error {
  constructor(modifierName: string, flag: string) {
    super(`Modifier "${modifierName}" requires ${flag}`);
    this.name = "MissingModifierParameterError";
  }
}

/** Thrown when an option's value falls outside the set that option accepts. */
export class UnsupportedOptionError extends Error {
  constructor(option: string, value: string, supported: readonly string[]) {
    super(
      `Unsupported ${option} "${value}"; supported: ${supported.join(", ")}`,
    );
    this.name = "UnsupportedOptionError";
  }
}
