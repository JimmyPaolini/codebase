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
  { code: "23333510000a", columns: 6, filedUnder: ["waterfalls"], rows: 2 },
  { code: "2333335100000a", columns: 7, filedUnder: ["waterfalls"], rows: 2 },
  { code: "233333351000000a", columns: 8, filedUnder: ["waterfalls"], rows: 2 },
  {
    code: "23333333510000000a",
    columns: 9,
    filedUnder: ["waterfalls"],
    rows: 2,
  },
  {
    code: "2333333335100000000a",
    columns: 10,
    filedUnder: ["waterfalls"],
    rows: 2,
  },
  {
    code: "233333333351000000000a",
    columns: 11,
    filedUnder: ["waterfalls"],
    rows: 2,
  },
  {
    code: "23333333333510000000000a",
    columns: 12,
    filedUnder: ["waterfalls"],
    rows: 2,
  },

  // 3 rows
  { code: "2335500aa331", columns: 4, filedUnder: ["waterfalls"], rows: 3 },
  { code: "233355000aa3331", columns: 5, filedUnder: ["waterfalls"], rows: 3 },
  {
    code: "23333550000aa33331",
    columns: 6,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "2333335500000aa333331",
    columns: 7,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "233333355000000aa3333331",
    columns: 8,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "23333333550000000aa33333331",
    columns: 9,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "2333333335500000000aa333333331",
    columns: 10,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "233333333355000000000aa3333333331",
    columns: 11,
    filedUnder: ["waterfalls"],
    rows: 3,
  },
  {
    code: "23333333333550000000000aa33333333331",
    columns: 12,
    filedUnder: ["waterfalls"],
    rows: 3,
  },

  // 4 rows
  { code: "23550aa3510a", columns: 3, filedUnder: ["waterfalls"], rows: 4 },
  { code: "2335500aa335100a", columns: 4, filedUnder: ["waterfalls"], rows: 4 },
  {
    code: "233355000aa33351000a",
    columns: 5,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "23333550000aa3333510000a",
    columns: 6,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "2333335500000aa333335100000a",
    columns: 7,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "233333355000000aa33333351000000a",
    columns: 8,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "23333333550000000aa3333333510000000a",
    columns: 9,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "2333333335500000000aa333333335100000000a",
    columns: 10,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "233333333355000000000aa33333333351000000000a",
    columns: 11,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
  {
    code: "23333333333550000000000aa3333333333510000000000a",
    columns: 12,
    filedUnder: ["waterfalls"],
    rows: 4,
  },
];
/* cspell:enable */
