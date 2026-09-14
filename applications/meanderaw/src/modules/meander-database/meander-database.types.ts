// 🏷️ Types

import type { MEANDER_PROVENANCES } from "./meander-database.constants";

/** Which of the two ways a meander row came to exist: see {@link MEANDER_PROVENANCES}. */
export type MeanderProvenance = (typeof MEANDER_PROVENANCES)[number];

/**
 * The fields needed to persist one meander row — everything but the
 * database's own auto-generated `id`.
 */
export interface MeanderRecord {
  readonly code: string;
  readonly columns: number;
  readonly pitch: number;
  readonly provenance: MeanderProvenance;
  readonly rows: number;
  readonly svg: string;
}
