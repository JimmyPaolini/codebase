// 🏷️ Types

import type { MeanderType } from "../meander-classification/meander-classification.types";
import type { MosaicSubFamily } from "../mosaic-tile/mosaic-tile.types";
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
  readonly components: number;
  readonly cycles: number;
  readonly family: MeanderType | null;
  readonly freeEnds: number;
  readonly hasBranching: boolean;
  readonly hasCrossing: boolean;
  readonly inkTJunctions: number;
  readonly inkXJunctions: number;
  readonly negativeTJunctions: number;
  readonly negativeXJunctions: number;
  readonly pitch: number;
  readonly provenance: MeanderProvenance;
  readonly rows: number;
  readonly subFamily: MosaicSubFamily | null;
  readonly svg: string;
}
