// ♟️ Constants

import { PARALLEL_HARDCODED_MEANDERS_1 } from "./parallel-1.constants";
import { PARALLEL_HARDCODED_MEANDERS_2 } from "./parallel-2.constants";
import { PARALLEL_HARDCODED_MEANDERS_3 } from "./parallel-3.constants";
import { PARALLEL_HARDCODED_MEANDERS_4 } from "./parallel-4.constants";
import { PARALLEL_HARDCODED_MEANDERS_5 } from "./parallel-5.constants";

import type { CorpusEntry } from "./corpus.types";

/**
 * `parallel`'s committed corpus, reassembled from the chunk files it is split
 * across — this family alone holds more entries than one file can carry under
 * the 512-line cap.
 */
export const PARALLEL_HARDCODED_MEANDERS: readonly CorpusEntry[] = [
  ...PARALLEL_HARDCODED_MEANDERS_1,
  ...PARALLEL_HARDCODED_MEANDERS_2,
  ...PARALLEL_HARDCODED_MEANDERS_3,
  ...PARALLEL_HARDCODED_MEANDERS_4,
  ...PARALLEL_HARDCODED_MEANDERS_5,
];
