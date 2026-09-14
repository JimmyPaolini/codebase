// ♟️ Constants

import { PARALLEL_HARDCODED_MEANDERS_1 } from "./parallel-1.constants";
import { PARALLEL_HARDCODED_MEANDERS_2 } from "./parallel-2.constants";
import { PARALLEL_HARDCODED_MEANDERS_3 } from "./parallel-3.constants";
import { PARALLEL_HARDCODED_MEANDERS_4 } from "./parallel-4.constants";
import { PARALLEL_HARDCODED_MEANDERS_5 } from "./parallel-5.constants";
import { PARALLEL_HARDCODED_MEANDERS_6 } from "./parallel-6.constants";

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * `parallel`'s committed corpus, reassembled from the chunk files
 * `scripts/generate-hardcoded-corpus.ts` split it across — see
 * `MAXIMUM_ENTRIES_PER_CHUNK` there for why this family alone needed more
 * than one.
 */
export const PARALLEL_HARDCODED_MEANDERS: readonly HardcodedMeanderEntry[] = [
  ...PARALLEL_HARDCODED_MEANDERS_1,
  ...PARALLEL_HARDCODED_MEANDERS_2,
  ...PARALLEL_HARDCODED_MEANDERS_3,
  ...PARALLEL_HARDCODED_MEANDERS_4,
  ...PARALLEL_HARDCODED_MEANDERS_5,
  ...PARALLEL_HARDCODED_MEANDERS_6,
];
