// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part 11 of the historical corpus, containing the waterfalls family meanders
 * extrapolated across 2, 3, and 4 rows up to 12 columns beyond the edge budget.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const HISTORICAL_CORPUS_11: readonly CorpusEntry[] = [
  // 2 rows
  { code: "23333533331a", columns: 6, filedUnder: ["waterfalls"], rows: 2 },
  { code: "2333335333331a", columns: 7, filedUnder: ["waterfalls"], rows: 2 },
  { code: "233333353333331a", columns: 8, filedUnder: ["waterfalls"], rows: 2 },
  {
    code: "23333333533333331a",
    columns: 9,
    filedUnder: ["waterfalls"],
    rows: 2,
  },
  {
    code: "2333333335333333331a",
    columns: 10,
    filedUnder: ["waterfalls"],
    rows: 2,
  },
  {
    code: "233333333353333333331a",
    columns: 11,
    filedUnder: ["waterfalls"],
    rows: 2,
  },
  {
    code: "23333333333533333333331a",
    columns: 12,
    filedUnder: ["waterfalls"],
    rows: 2,
  },

  // 3 rows
  { code: "2335335a31a3", columns: 4, filedUnder: ["waterfalls"], rows: 3 },
  { code: "233353335a331a3", columns: 5, filedUnder: ["waterfalls"], rows: 3 },
  {
    code: "23333533335a3331a3",
    columns: 6,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "2333335333335a33331a3",
    columns: 7,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "233333353333335a333331a3",
    columns: 8,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "23333333533333335a3333331a3",
    columns: 9,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "2333333335333333335a33333331a3",
    columns: 10,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "233333333353333333335a333333331a3",
    columns: 11,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "23333333333533333333335a3333333331a3",
    columns: 12,
    filedUnder: ["waterfalls"],
    rows: 3,
  },

  // 4 rows
  { code: "23535a5a3a31", columns: 3, filedUnder: ["waterfalls"], rows: 4 },
  { code: "2335335a35a31a33", columns: 4, filedUnder: ["waterfalls"], rows: 4 },
  {
    code: "233353335a335a331a33",
    columns: 5,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "23333533335a3335a3331a33",
    columns: 6,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "2333335333335a33335a33331a33",
    columns: 7,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "233333353333335a333335a333331a33",
    columns: 8,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "23333333533333335a3333335a3333331a33",
    columns: 9,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "2333333335333333335a33333335a33333331a33",
    columns: 10,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "233333333353333333335a333333335a333333331a33",
    columns: 11,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "23333333333533333333335a3333333335a3333333331a33",
    columns: 12,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
];
/* cspell:enable */
