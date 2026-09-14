// 🏷️ Types

import type { MeanderType } from "../meander-classification/meander-classification.types";
import type { Meander } from "../meander-database/entities/Meander.entity";

/**
 * One section of the index page: every row that earned `family`, in the
 * order the section itself lists them.
 *
 * `family` is `null` for the one section spec #813 asks the page to show
 * rather than hide — the meanders whose structure satisfied no family's
 * defining combination — see `UNCLASSIFIED_FAMILY_LABEL`.
 */
export interface MeanderIndexGroup {
  readonly family: MeanderType | null;
  readonly meanders: readonly Meander[];
}
