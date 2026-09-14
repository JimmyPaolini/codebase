// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of `cross`'s committed corpus, extracted once by
 * `scripts/generate-hardcoded-corpus.ts` from `output/cross/**\/*.svg`
 * through `LatticeIdentificationService.identifyDocument` — see that
 * script's own doc comment for the extraction this file's contents were
 * generated from, and `HardcodedMeandersService` for how it is ingested.
 * Split across several files the same way, at
 * `MAXIMUM_ENTRIES_PER_CHUNK`, to stay under the 512-line-per-file cap
 * once oxfmt has broken every long Code onto its own lines.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const CROSS_HARDCODED_MEANDERS: readonly HardcodedMeanderEntry[] = [
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
