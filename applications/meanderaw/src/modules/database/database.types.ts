// 🏷️ Types

import type { MEANDER_PROVENANCES } from "./database.constants";
import type { Meander } from "./entities/Meander.entity";

/** Which of the two ways a meander row came to exist: see {@link MEANDER_PROVENANCES}. */
export type MeanderProvenance = (typeof MEANDER_PROVENANCES)[number];

/**
 * The fields needed to persist one meander row — everything but the
 * database's own auto-generated `id`.
 */
export type MeanderRecord = Omit<Meander, "id">;

/** How wide and how deep one repeat is. */
export interface MeanderShape {
  readonly columns: number;
  readonly rows: number;
}
