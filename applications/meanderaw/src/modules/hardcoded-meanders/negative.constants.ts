// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of `negative`'s committed corpus: the meanders of that family that lie
 * beyond the reach of `MeanderEnumerationService`, preserved as Codes
 * extracted once from the drawings this repository used to commit as files.
 * See `HARDCODED_MEANDERS_BY_FAMILY` for how the boundary against the
 * enumerated half is drawn, and `HardcodedMeandersService` for how these are
 * ingested.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const NEGATIVE_HARDCODED_MEANDERS: readonly HardcodedMeanderEntry[] = [
  { code: "73b77bb77bb77bb73b", columns: 2, rows: 10 },
  { code: "373f3f3f3f3f3f3f3b", columns: 2, rows: 10 },
  { code: "4fcfcfcf8", columns: 1, rows: 10 },
  { code: "7fffffffb", columns: 1, rows: 10, subFamily: "mesh" },
  { code: "56eddeeddeeddeed9a", columns: 2, rows: 10 },
  { code: "37b7b7b7b", columns: 1, rows: 10 },
  { code: "333333333", columns: 1, rows: 10, subFamily: "lines" },
  { code: "7b7b7b7b3", columns: 1, rows: 10 },
  { code: "337b37b33", columns: 1, rows: 10 },
  { code: "7cb7cb7cb", columns: 1, rows: 10 },
  { code: "73b77bb77bb77bb77bb3", columns: 2, rows: 11 },
  { code: "373f3f3f3f3f3f3f3f3b", columns: 2, rows: 11 },
  { code: "4fcfcfcfcb", columns: 1, rows: 11 },
  { code: "7ffffffffb", columns: 1, rows: 11, subFamily: "mesh" },
  { code: "56eddeeddeeddeeddea9", columns: 2, rows: 11 },
  { code: "37b7b7b7b3", columns: 1, rows: 11 },
  { code: "3333333333", columns: 1, rows: 11, subFamily: "lines" },
  { code: "7b7b7b7b7b", columns: 1, rows: 11 },
  { code: "337b37b37b", columns: 1, rows: 11 },
  { code: "7cb7cb7cb3", columns: 1, rows: 11 },
  { code: "73b77bb77bb77bb77bb73b", columns: 2, rows: 12 },
  { code: "373f3f3f3f3f3f3f3f3f3b", columns: 2, rows: 12 },
  { code: "4fcfcfcfcf8", columns: 1, rows: 12 },
  { code: "7fffffffffb", columns: 1, rows: 12, subFamily: "mesh" },
  { code: "56eddeeddeeddeeddeed9a", columns: 2, rows: 12 },
  { code: "37b7b7b7b7b", columns: 1, rows: 12 },
  { code: "33333333333", columns: 1, rows: 12, subFamily: "lines" },
  { code: "7b7b7b7b7b3", columns: 1, rows: 12 },
  { code: "337b37b37b3", columns: 1, rows: 12 },
  { code: "7cb7cb7cb78", columns: 1, rows: 12 },
  { code: "73b77bb73b", columns: 2, rows: 6 },
  { code: "373f3f3f3b", columns: 2, rows: 6 },
  { code: "56eddeed9a", columns: 2, rows: 6 },
  { code: "73b77bb77bb3", columns: 2, rows: 7 },
  { code: "373f3f3f3f3b", columns: 2, rows: 7 },
  { code: "56eddeeddea9", columns: 2, rows: 7 },
  { code: "73b77bb77bb73b", columns: 2, rows: 8 },
  { code: "373f3f3f3f3f3b", columns: 2, rows: 8 },
  { code: "56eddeeddeed9a", columns: 2, rows: 8 },
  { code: "73b77bb77bb77bb3", columns: 2, rows: 9 },
  { code: "373f3f3f3f3f3f3b", columns: 2, rows: 9 },
  { code: "56eddeeddeeddea9", columns: 2, rows: 9 },
];
/* cspell:enable */
