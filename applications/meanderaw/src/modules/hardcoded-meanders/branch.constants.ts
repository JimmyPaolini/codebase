// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of `branch`'s committed corpus: the meanders of that family that lie
 * beyond the reach of `MeanderEnumerationService`, preserved as Codes
 * extracted once from the drawings this repository used to commit as files.
 * See `HARDCODED_MEANDERS_BY_FAMILY` for how the boundary against the
 * enumerated half is drawn, and `HardcodedMeandersService` for how these are
 * ingested.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const BRANCH_HARDCODED_MEANDERS: readonly HardcodedMeanderEntry[] = [
  { code: "44cccccccccccccc88", columns: 2, rows: 10, subFamily: "bars" },
  { code: "61e1e1e1e1e1e1e1a1", columns: 2, rows: 10 },
  { code: "252d2d2d2d2d2d2d29", columns: 2, rows: 10 },
  {
    code: "544677ccccccccccccccccccccccccccccccccccccccccccabb988",
    columns: 6,
    rows: 10,
  },
  {
    code: "54446777ccccccccccccccccccccccccccccccccccccccccccccccccccccccccabbb9888",
    columns: 8,
    rows: 10,
  },
  {
    code: "5444467777ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccabbbb98888",
    columns: 10,
    rows: 10,
  },
  { code: "44cccccccccccccccc88", columns: 2, rows: 11, subFamily: "bars" },
  { code: "61e1e1e1e1e1e1e1e1a1", columns: 2, rows: 11 },
  { code: "252d2d2d2d2d2d2d2d29", columns: 2, rows: 11 },
  {
    code: "544677ccccccccccccccccccccccccccccccccccccccccccccccccabb988",
    columns: 6,
    rows: 11,
  },
  {
    code: "54446777ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccabbb9888",
    columns: 8,
    rows: 11,
  },
  {
    code: "5444467777ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccabbbb98888",
    columns: 10,
    rows: 11,
  },
  { code: "44cccccccccccccccccc88", columns: 2, rows: 12, subFamily: "bars" },
  { code: "61e1e1e1e1e1e1e1e1e1a1", columns: 2, rows: 12 },
  { code: "252d2d2d2d2d2d2d2d2d29", columns: 2, rows: 12 },
  {
    code: "544677ccccccccccccccccccccccccccccccccccccccccccccccccccccccabb988",
    columns: 6,
    rows: 12,
  },
  {
    code: "54446777ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccabbb9888",
    columns: 8,
    rows: 12,
  },
  {
    code: "5444467777ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccabbbb98888",
    columns: 10,
    rows: 12,
  },
  { code: "544677abb988", columns: 6, rows: 3 },
  { code: "54446777abbb9888", columns: 8, rows: 3 },
  { code: "5444467777abbbb98888", columns: 10, rows: 3 },
  { code: "544677ccccccabb988", columns: 6, rows: 4 },
  { code: "54446777ccccccccabbb9888", columns: 8, rows: 4 },
  { code: "5444467777ccccccccccabbbb98888", columns: 10, rows: 4 },
  { code: "544677ccccccccccccabb988", columns: 6, rows: 5 },
  { code: "54446777ccccccccccccccccabbb9888", columns: 8, rows: 5 },
  { code: "5444467777ccccccccccccccccccccabbbb98888", columns: 10, rows: 5 },
  { code: "44cccccc88", columns: 2, rows: 6, subFamily: "bars" },
  { code: "61e1e1e1a1", columns: 2, rows: 6 },
  { code: "252d2d2d29", columns: 2, rows: 6 },
  { code: "544677ccccccccccccccccccabb988", columns: 6, rows: 6 },
  { code: "54446777ccccccccccccccccccccccccabbb9888", columns: 8, rows: 6 },
  {
    code: "5444467777ccccccccccccccccccccccccccccccabbbb98888",
    columns: 10,
    rows: 6,
  },
  { code: "44cccccccc88", columns: 2, rows: 7, subFamily: "bars" },
  { code: "61e1e1e1e1a1", columns: 2, rows: 7 },
  { code: "252d2d2d2d29", columns: 2, rows: 7 },
  { code: "544677ccccccccccccccccccccccccabb988", columns: 6, rows: 7 },
  {
    code: "54446777ccccccccccccccccccccccccccccccccabbb9888",
    columns: 8,
    rows: 7,
  },
  {
    code: "5444467777ccccccccccccccccccccccccccccccccccccccccabbbb98888",
    columns: 10,
    rows: 7,
  },
  { code: "44cccccccccc88", columns: 2, rows: 8, subFamily: "bars" },
  { code: "61e1e1e1e1e1a1", columns: 2, rows: 8 },
  { code: "252d2d2d2d2d29", columns: 2, rows: 8 },
  { code: "544677ccccccccccccccccccccccccccccccabb988", columns: 6, rows: 8 },
  {
    code: "54446777ccccccccccccccccccccccccccccccccccccccccabbb9888",
    columns: 8,
    rows: 8,
  },
  {
    code: "5444467777ccccccccccccccccccccccccccccccccccccccccccccccccccabbbb98888",
    columns: 10,
    rows: 8,
  },
  { code: "44cccccccccccc88", columns: 2, rows: 9, subFamily: "bars" },
  { code: "61e1e1e1e1e1e1a1", columns: 2, rows: 9 },
  { code: "252d2d2d2d2d2d29", columns: 2, rows: 9 },
  {
    code: "544677ccccccccccccccccccccccccccccccccccccabb988",
    columns: 6,
    rows: 9,
  },
  {
    code: "54446777ccccccccccccccccccccccccccccccccccccccccccccccccabbb9888",
    columns: 8,
    rows: 9,
  },
  {
    code: "5444467777ccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccabbbb98888",
    columns: 10,
    rows: 9,
  },
];
/* cspell:enable */
