// 🏷️ Types

import type { SubFamily } from "../classification/sub-family.types";

/**
 * One historical corpus drawing, preserved as a hardcoded Code constant:
 * just enough for {@link CorpusService.ingest} to decode, render,
 * and characterize it again through the generic pipeline, with no `svg` of
 * its own to go stale against the renderer that produces one.
 */
export interface CorpusEntry {
  readonly code: string;
  readonly columns: number;
  readonly rows: number;
  readonly subFamily?: SubFamily;
}

/**
 * The nine families the historical corpus's Hardcoded constants cover —
 * every `MeanderType` except `mosaic`, whose committed corpus was already
 * drawn from an enumerated unit space and so is reproduced by
 * `EnumerationService` rather than preserved as constants. See
 * `CORPUS_BY_FAMILY`'s own doc comment, in
 * `hardcoded-meanders.constants.ts`, for where the boundary between the
 * enumerated and hardcoded halves is drawn.
 */
export type CorpusFamily =
  | "boxes"
  | "branch"
  | "chain"
  | "cross"
  | "negative"
  | "parallel"
  | "snake"
  | "swirl"
  | "whirl";
