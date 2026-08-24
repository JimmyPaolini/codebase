// ♟️ Constants

import type { DotShape } from "../meander-generation/meander-generation.types";

/**
 * `period` values swept for the `alternated` modifier's batch combinations:
 * two representative points inside the shared `MINIMUM_PERIOD`–`MAXIMUM_VALUE`
 * bounds, distinct enough to show the modifier actually varies with `period`
 * without sweeping the whole range.
 */
export const ALTERNATED_SWEEP_PERIODS: readonly number[] = [2, 4];

/**
 * `repeatCount` every non-cycle-constrained combination is generated with.
 * Matches `generate`'s own `DEFAULT_REPEAT_COUNT` so a batch file and a
 * single-pattern file for the same type/rows/modifier are identical.
 */
export const BASE_REPEAT_COUNT = 6;

export const DEFAULT_OUTPUT_DIRECTORY = "output";

/**
 * Every shape swept for the `dot` modifier's batch combinations. `DotShape`
 * only has two members, so this sweeps the type's full domain rather than a
 * sample of it.
 */
export const DOT_SWEEP_SHAPES: readonly DotShape[] = ["bounce", "up"];

/**
 * Highest `rows` value swept per type, starting from that type's own
 * `STRUCTURAL_MINIMUM_ROWS`. Chosen well below the shared `MAXIMUM_VALUE`
 * (12) so the sweep stays a bounded sample of the space — enough rows to
 * show a motif at a few different densities — rather than the full
 * structural-minimum-through-12 range, which would multiply the file count
 * for no additional coverage of new geometry.
 */
export const ROWS_SWEEP_MAXIMUM = 8;
