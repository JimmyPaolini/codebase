// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part 7 of the historical corpus, extracted once by
 * `scripts/extract-historical-corpus.ts` from the `output/` drawing tree
 * this repository used to commit — see `HISTORICAL_CORPUS` for what the
 * whole set is and how `filedUnder` is to be read. Split at a fixed entry
 * line budget so no chunk crosses the 512-line cap once oxfmt has broken
 * every long Code's entry across several lines.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const HISTORICAL_CORPUS_7: readonly CorpusEntry[] = [
  {
    code: "3333333333333333333321",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "659a333333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "3333333333333333659a33",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "333333333333659a333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "33333333659a3333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "3333659a33333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "33333333333333333356a9",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "56a9333333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2133333333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "333333333333333356a933",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "3333333333333356a93333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "33333333333356a9333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "333333333356a933333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "3333333356a93333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "33333356a9333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "333356a933333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "3356a93333333333333333",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cccccca956cccccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cccccca965cccccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cccccccca965cccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cccccccca956cccccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca956cccca956cccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca965cccc9a56cccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca965cccccc9a56cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cccca965cccc9a56cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca956cccca965cccc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca956cccccca965cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cccca956cccca965cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca956cccccca956cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cccca956cccca956cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cca956cca956cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a965cc9a56cca965cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a965cc9a56cccca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a965cccc9a56cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca965cc9a56cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cca956cca965cc88",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cca956cccca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cccca956cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca956cca956cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cca956cccca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cccca956cca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44cca956cca956cca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156cca956a956cca95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2165cc9a56a965cc9a5688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a9659a56cca965cc9a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2165cc9a56cca9659a5688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a965cc9a56a965cc9a12",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a9659a56cca9659a5688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156cca956a956cca96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956a956cca956cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156cca956cca956a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cca956a956cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956a956cca956a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956a956cca956cca912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156cca956cca956a95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956cca956a956cca912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956a956cca956a95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956a956a956a95688",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "21659a56a9659a56a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "21659a56a9659a56cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "21659a56a965cc9a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "21659a56cca9659a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2165cc9a56a9659a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a9659a56a9659a56a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956a956a956a96588",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956a956a956cca921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956a956cca956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956cca956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156cca956a956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956a956a956a956a921",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956a956a956cca912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956a956cca956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156a956cca956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "2156cca956a956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "44a956a956a956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
  {
    code: "56a956a956a956a956a912",
    columns: 2,
    filedUnder: ["parallel"],
    rows: 12,
  },
];
/* cspell:enable */
