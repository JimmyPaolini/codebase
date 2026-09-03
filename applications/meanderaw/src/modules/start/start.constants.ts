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
 * Subdirectory of the output directory the mosaic permutations are written
 * to. They are kept out of the main sweep's own directory, and out of git,
 * because the enumeration runs to thousands of files — the named-type sweep
 * beside them is a reviewable hundred.
 */
export const PERMUTATIONS_SUBDIRECTORY = "permutations";

/** `repeatCount` every swept mosaic is drawn at, wide enough to read the tile's rhythm without dominating a contact sheet. */
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
