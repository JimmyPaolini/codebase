// ♟️ Constants

import { BOXES_HARDCODED_MEANDERS } from "./boxes.constants";
import { BRANCH_HARDCODED_MEANDERS } from "./branch.constants";
import { CHAIN_HARDCODED_MEANDERS } from "./chain.constants";
import { CROSS_HARDCODED_MEANDERS } from "./cross.constants";
import { NEGATIVE_HARDCODED_MEANDERS } from "./negative.constants";
import { PARALLEL_HARDCODED_MEANDERS } from "./parallel.constants";
import { SNAKE_HARDCODED_MEANDERS } from "./snake.constants";
import { SWIRL_HARDCODED_MEANDERS } from "./swirl.constants";
import { WHIRL_HARDCODED_MEANDERS } from "./whirl.constants";

import type { CorpusEntry, CorpusFamily } from "./corpus.types";

/**
 * Every family the historical corpus's Hardcoded constants cover, in the
 * order `CorpusService.ingest` ingests them — every
 * `MeanderType` except `mosaic`, whose whole committed corpus was already
 * drawn from an enumerated unit space and so is reproduced by
 * `EnumerationService` rather than preserved here.
 */
export const CORPUS_FAMILIES: readonly CorpusFamily[] = [
  "boxes",
  "branch",
  "chain",
  "cross",
  "negative",
  "parallel",
  "snake",
  "swirl",
  "whirl",
];

/**
 * The historical corpus's hardcoded Code constants, keyed by family — what
 * `CorpusService.ingest` reads.
 *
 * **Only the meanders beyond the enumeration's reach are here**, which is
 * spec #813's own boundary: "the existing corpus's meanders beyond that
 * ceiling become Hardcoded". The Codes were extracted once from the
 * `output/<family>/*.svg` tree this repository used to commit, through
 * `AddressService.identifyDocument`, and then filtered against
 * what `EnumerationService` actually enumerates — 1,072 distinct
 * entries down to the 965 held here.
 *
 * **The filter is by shape, not by Code, and that is the stronger test.**
 * An entry is dropped when its `rows`/`columns` is one of the fourteen
 * shapes `EnumerationService.shapes` walks — the shapes whose
 * `columns × (2 × rows − 3)` edges fit `EDGE_BUDGET`, from
 * `SWEEP_MINIMUM_ROWS` down. The enumeration applies
 * no degree ceiling and no family filter: at an admitted shape it walks
 * *every* subset of that shape's edges and folds the result by symmetry, so
 * every structurally distinct meander of that shape is already a row before
 * ingestion begins. Filtering by exact lattice address instead would have
 * dropped only 66 of the 107: the other 41 are non-canonical spellings of
 * symmetry classes the enumeration had already committed under their
 * canonical Code, so keeping them would have put the same drawing in the
 * corpus twice under two names rather than colliding outright. Both numbers
 * were measured by running the real enumeration and testing each entry's
 * Code — and its canonical identifier — for membership, not inferred from
 * the row count.
 *
 * Nothing recomputes this filter at run time. The constants are the record,
 * and `draw-sweep.command.integration.test.ts` is what keeps them honest: it
 * asserts that no entry here sits at a shape the enumeration admits, so a
 * budget raised in `EDGE_BUDGET` fails there rather than
 * colliding in a sweep.
 */
export const CORPUS_BY_FAMILY: Readonly<
  Record<CorpusFamily, readonly CorpusEntry[]>
> = {
  boxes: BOXES_HARDCODED_MEANDERS,
  branch: BRANCH_HARDCODED_MEANDERS,
  chain: CHAIN_HARDCODED_MEANDERS,
  cross: CROSS_HARDCODED_MEANDERS,
  negative: NEGATIVE_HARDCODED_MEANDERS,
  parallel: PARALLEL_HARDCODED_MEANDERS,
  snake: SNAKE_HARDCODED_MEANDERS,
  swirl: SWIRL_HARDCODED_MEANDERS,
  whirl: WHIRL_HARDCODED_MEANDERS,
};

// 🚨 Errors

/**
 * Thrown when ingesting a hardcoded entry fails because its Code already
 * belongs to a row committed to the database — an enumerated row #817 wrote,
 * or another hardcoded entry — rather than being silently overwritten.
 */
export class DuplicateCorpusCodeError extends Error {
  constructor(code: string, family: string, cause: unknown) {
    super(
      `hardcoded ${family} entry "${code}" collided with a Code already committed to the database`,
      { cause },
    );
    this.name = "DuplicateCorpusCodeError";
  }
}
