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
 * Every shape swept for the `dot` modifier's batch combinations. `DotShape`
 * only has two members, so this sweeps the type's full domain rather than a
 * sample of it.
 */
export const DOT_SWEEP_SHAPES: readonly DotShape[] = ["bounce", "up"];

/**
 * `strands` values swept for the `plied` modifier's batch combinations.
 *
 * Deliberately two points rather than a range, and deliberately not the
 * `parallel` family's own default of two: the unmodified sweep already
 * draws that ply, and `plied` naming it produces a byte-identical document
 * under a second filename — `parallel-motif.service.unit.test.ts` asserts
 * that identity. Three and four are one odd ply and one even one, which is
 * what shows the innermost strand's turn moving with the count. Nothing
 * deeper is swept because every further ply widens each repeat unit by two
 * more lattice columns and introduces no new kind of junction; the highest
 * value here is also `parallel`'s `STRUCTURAL_MINIMUM_ROWS`, since a bundle
 * of N strands needs N rows.
 */
export const PLIED_SWEEP_STRAND_COUNTS: readonly number[] = [3, 4];

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
 * Subdirectory of a row count's own directory that the mosaic permutations
 * are written under, one column-span directory deep. They are nested rather
 * than left beside the named-type sweep because the enumeration runs to
 * thousands of files — the named-type sweep beside them is a reviewable
 * hundred.
 */
export const PERMUTATIONS_SUBDIRECTORY = "permutations";

/** `repeatCount` every swept mosaic is drawn at, wide enough to read the tile's rhythm without dominating the index page. */
export const PERMUTATION_REPEAT_COUNT = 6;

/**
 * Highest `rows` value swept per type, starting from that type's own
 * `STRUCTURAL_MINIMUM_ROWS`. Chosen well below the shared `MAXIMUM_VALUE`
 * (12) so the sweep stays a bounded sample of the space — enough rows to
 * show a motif at a few different densities — rather than the full
 * structural-minimum-through-12 range, which would multiply the file count
 * for no additional coverage of new geometry.
 */
export const ROWS_SWEEP_MAXIMUM = 8;

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
