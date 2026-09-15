import { z } from "zod";

import { EDGE_BUDGET } from "./modules/enumeration/enumeration.constants";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  /**
   * How many edges one tile may hold before the sweep refuses its shape,
   * read by `TileEnumerationService` in place of the constant it used to
   * import. Defaults to `EDGE_BUDGET`, so a bare invocation walks exactly
   * the space it walks today.
   */
  SWEEP_EDGE_BUDGET: z.coerce.number().int().positive().default(EDGE_BUDGET),

  /**
   * The widest column count `EnumerationService.shapes` sweeps, layered on
   * top of the edge budget as a review filter rather than replacing it.
   * Defaults to unbounded, so a bare invocation is limited only by the
   * budget, exactly as it is today.
   */
  SWEEP_MAXIMUM_COLUMNS: z.coerce
    .number()
    .int()
    .positive()
    .default(Number.MAX_SAFE_INTEGER),

  /**
   * The deepest row count `EnumerationService.shapes` sweeps, layered on
   * top of the edge budget as a review filter rather than replacing it.
   * Defaults to unbounded, so a bare invocation climbs exactly as high as
   * the budget admits, exactly as it does today.
   */
  SWEEP_MAXIMUM_ROWS: z.coerce
    .number()
    .int()
    .positive()
    .default(Number.MAX_SAFE_INTEGER),
});
