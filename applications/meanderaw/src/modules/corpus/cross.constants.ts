// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part of `cross`'s committed corpus: the meanders of that family that lie
 * beyond the reach of `EnumerationService`, preserved as Codes
 * extracted once from the drawings this repository used to commit as files.
 * See `CORPUS_BY_FAMILY` for how the boundary against the
 * enumerated half is drawn, and `CorpusService` for how these are
 * ingested.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const CROSS_HARDCODED_MEANDERS: readonly CorpusEntry[] = [
  { code: "56cccc883344cccca9", columns: 2, rows: 10 },
  { code: "56ccccccffcccccca9", columns: 2, rows: 10 },
  { code: "56cccc883344cccccca9", columns: 2, rows: 11 },
  { code: "56ccccccffcccccccca9", columns: 2, rows: 11 },
  { code: "56cccccc883344cccccca9", columns: 2, rows: 12 },
  { code: "56ccccccccffcccccccca9", columns: 2, rows: 12 },
  { code: "56883344a9", columns: 2, rows: 6 },
  { code: "56ccffcca9", columns: 2, rows: 6 },
  { code: "56883344cca9", columns: 2, rows: 7 },
  { code: "56ccffcccca9", columns: 2, rows: 7 },
  { code: "56cc883344cca9", columns: 2, rows: 8 },
  { code: "56ccccffcccca9", columns: 2, rows: 8 },
  { code: "56cc883344cccca9", columns: 2, rows: 9 },
  { code: "56ccccffcccccca9", columns: 2, rows: 9 },
];
/* cspell:enable */
