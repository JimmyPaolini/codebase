// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of `parallel`'s committed corpus, extracted once by
 * `scripts/generate-hardcoded-corpus.ts` from `output/parallel/**\/*.svg`
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
export const PARALLEL_HARDCODED_MEANDERS_6: readonly HardcodedMeanderEntry[] = [
  { code: "213356a9333356a9", columns: 2, rows: 9 },
  { code: "56a9333356a93312", columns: 2, rows: 9 },
  { code: "21333356a93356a9", columns: 2, rows: 9 },
  { code: "333356a933333312", columns: 2, rows: 9 },
  { code: "3333659a33333321", columns: 2, rows: 9 },
  { code: "659a333333659a33", columns: 2, rows: 9 },
  { code: "333356a933333321", columns: 2, rows: 9 },
  { code: "3356a933333356a9", columns: 2, rows: 9 },
  { code: "56a933333356a933", columns: 2, rows: 9 },
  { code: "2133333356a93333", columns: 2, rows: 9 },
  { code: "3333333333333312", columns: 2, rows: 9, subFamily: "dashes" },
  { code: "333333333333659a", columns: 2, rows: 9 },
  { code: "33333333659a3333", columns: 2, rows: 9 },
  { code: "3333659a33333333", columns: 2, rows: 9 },
  { code: "659a333333333333", columns: 2, rows: 9 },
  { code: "3333333333333321", columns: 2, rows: 9, subFamily: "dashes" },
  { code: "33333333333356a9", columns: 2, rows: 9 },
  { code: "333333333356a933", columns: 2, rows: 9 },
  { code: "3333333356a93333", columns: 2, rows: 9 },
  { code: "33333356a9333333", columns: 2, rows: 9 },
  { code: "333356a933333333", columns: 2, rows: 9 },
  { code: "3356a93333333333", columns: 2, rows: 9 },
  { code: "56a9333333333333", columns: 2, rows: 9 },
  { code: "2133333333333333", columns: 2, rows: 9, subFamily: "dashes" },
];
/* cspell:enable */
