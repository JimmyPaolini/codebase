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

import type {
  HardcodedMeanderEntry,
  HardcodedMeanderFamily,
} from "./hardcoded-meanders.types";

/**
 * Every family the historical corpus's Hardcoded constants cover, in the
 * order `HardcodedMeandersService.ingest` ingests them — every
 * `MeanderType` except `mosaic`, which already draws from an enumerated
 * unit space rather than from per-family procedural motif logic, so its
 * committed corpus — and `negative`'s own `permutations/` subtree, which
 * inverts `mosaic` tiles the same exhaustive way — are both left to ticket
 * #817's generalized Enumerated pass instead of being preserved as
 * hardcoded constants here. `negative`'s ten named sources are still drawn
 * from a per-family motif service exactly as the other eight are, so its
 * own corpus is a member of this set. See
 * `scripts/generate-hardcoded-corpus.ts` and
 * `testing/hardcoded-corpus/corpus.ts` for where that boundary is drawn.
 */
export const HARDCODED_MEANDER_FAMILIES: readonly HardcodedMeanderFamily[] = [
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
 * The full historical corpus's hardcoded Code constants, keyed by family —
 * what `HardcodedMeandersService.ingest` reads and what
 * `scripts/generate-hardcoded-corpus.ts` writes each per-family array of.
 */
export const HARDCODED_MEANDERS_BY_FAMILY: Readonly<
  Record<HardcodedMeanderFamily, readonly HardcodedMeanderEntry[]>
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
export class DuplicateHardcodedCodeError extends Error {
  constructor(code: string, family: string, cause: unknown) {
    super(
      `hardcoded ${family} entry "${code}" collided with a Code already committed to the database`,
      { cause },
    );
    this.name = "DuplicateHardcodedCodeError";
  }
}
