// 🏷️ Types

import type { MosaicSubFamily } from "../mosaic-tile/mosaic-tile.types";

/**
 * One historical corpus drawing, preserved as a hardcoded Code constant:
 * just enough for {@link HardcodedMeandersService.ingest} to decode, render,
 * and characterize it again through the generic pipeline, with no `svg` of
 * its own to go stale against the renderer that produces one.
 */
export interface HardcodedMeanderEntry {
  readonly code: string;
  readonly columns: number;
  readonly rows: number;
  readonly subFamily?: MosaicSubFamily;
}

/**
 * The nine named types the historical corpus's Hardcoded constants cover —
 * every `MeanderType` except `mosaic`, which already draws from an
 * enumerated unit space today rather than from per-family procedural motif
 * logic. See `HARDCODED_MEANDERS_BY_FAMILY`'s own doc comment, in
 * `hardcoded-meanders.constants.ts`, for why `mosaic` and `negative`'s
 * enumerated `permutations/` subtree are both left to ticket #817's
 * generalized Enumerated pass instead.
 */
export type HardcodedMeanderFamily =
  | "boxes"
  | "branch"
  | "chain"
  | "cross"
  | "negative"
  | "parallel"
  | "snake"
  | "swirl"
  | "whirl";
