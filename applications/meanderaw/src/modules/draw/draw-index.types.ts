// 🏷️ Types

import type { Meander } from "../database/entities/Meander.entity";

/**
 * One section of the index page: every row that earned `family`, in the
 * order the section itself lists them.
 *
 * `family` is `null` for the one section spec #813 asks the page to show
 * rather than hide — the meanders whose structure satisfied no family's
 * defining combination — see `UNCLASSIFIED_FAMILY_LABEL`.
 */
export interface MeanderIndexGroup {
  readonly family: null | string;
  readonly meanders: readonly Meander[];
}
