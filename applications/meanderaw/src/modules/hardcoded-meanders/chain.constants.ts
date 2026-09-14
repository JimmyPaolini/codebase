// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of `chain`'s committed corpus: the meanders of that family that lie
 * beyond the reach of `MeanderEnumerationService`, preserved as Codes
 * extracted once from the drawings this repository used to commit as files.
 * See `HARDCODED_MEANDERS_BY_FAMILY` for how the boundary against the
 * enumerated half is drawn, and `HardcodedMeandersService` for how these are
 * ingested.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const CHAIN_HARDCODED_MEANDERS: readonly HardcodedMeanderEntry[] = [
  {
    code: "6333333354c6333335cccc63335cccccc635cccccccc48cccccccca39cccccca3339cccca333339c8a33333339",
    columns: 10,
    rows: 10,
  },
  {
    code: "46333333356333333354cc6333335cc6333335ccccc63335cccc63335ccccccc635cccccc635cccccccc84cccccccc48ccccccca39cccccccca39ccccca3339cccccca3339ccca333339cccca333339ca3333333988a33333339",
    columns: 20,
    rows: 10,
  },
  {
    code: "333333335633333356333335cc633333cc63335cccc63335ccc635cccccc635ccccc48cccccc84cccccca39cccca39ccccca3339cca3339ccca333339a3333399a33333333333333",
    columns: 16,
    rows: 10,
  },
  {
    code: "633333335c6333335ccc63335ccccc635ccccccc48ccccccca39ccccca3339ccca3333399a3333333",
    columns: 9,
    rows: 10,
  },
  {
    code: "63333333354c63333335cccc633335cccccc6335cccccccc61cccccccccc29cccccccca339cccccca33339cccca3333339c8a333333339",
    columns: 11,
    rows: 11,
  },
  {
    code: "4633333333563333333354cc63333335cc63333335ccccc633335cccc633335ccccccc6335cccccc6335ccccccccc25cccccccc61ccccccccca1cccccccccc29ccccccca339cccccccca339ccccca33339cccccca33339ccca3333339cccca3333339ca33333333988a333333339",
    columns: 22,
    rows: 11,
  },
  {
    code: "333333333563333333563333335cc6333333cc633335cccc633335ccc6335cccccc6335ccccc61cccccccc25ccccccc29cccccca1ccccccca339cccca339ccccca33339cca33339ccca3333339a33333399a3333333333333333",
    columns: 18,
    rows: 11,
  },
  {
    code: "6333333335c63333335ccc633335ccccc6335ccccccc61ccccccccc29ccccccca339ccccca33339ccca33333399a33333333",
    columns: 10,
    rows: 11,
  },
  {
    code: "633333333354c633333335cccc6333335cccccc63335cccccccc635cccccccccc48cccccccccca39cccccccca3339cccccca333339cccca33333339c8a3333333339",
    columns: 12,
    rows: 12,
  },
  {
    code: "463333333335633333333354cc633333335cc633333335ccccc6333335cccc6333335ccccccc63335cccccc63335ccccccccc635cccccccc635cccccccccc84cccccccccc48ccccccccca39cccccccccca39ccccccca3339cccccccca3339ccccca333339cccccca333339ccca33333339cccca33333339ca333333333988a3333333339",
    columns: 24,
    rows: 12,
  },
  {
    code: "333333333356333333335633333335cc63333333cc6333335cccc6333335ccc63335cccccc63335ccccc635cccccccc635ccccccc48cccccccc84cccccccca39cccccca39ccccccca3339cccca3339ccccca333339cca333339ccca33333339a333333399a333333333333333333",
    columns: 20,
    rows: 12,
  },
  {
    code: "63333333335c633333335ccc6333335ccccc63335ccccccc635ccccccccc48ccccccccca39ccccccca3339ccccca333339ccca333333399a333333333",
    columns: 11,
    rows: 12,
  },
  { code: "6354c48c8a39", columns: 4, rows: 4 },
  { code: "46356354c84cc48ca3988a39", columns: 8, rows: 4 },
  { code: "335644889a33", columns: 4, rows: 4 },
  { code: "63354c61cccc29c8a339", columns: 5, rows: 5 },
  { code: "4633563354cc25cc61ccca1cccc29ca33988a339", columns: 10, rows: 5 },
  { code: "333563561cc2cc29a19a3333", columns: 6, rows: 5 },
  { code: "6335c61ccc299a33", columns: 4, rows: 5 },
  { code: "633354c635cccc48cccca39c8a3339", columns: 6, rows: 6 },
  {
    code: "463335633354cc635cc635cccc84cccc48ccca39cccca39ca333988a3339",
    columns: 12,
    rows: 6,
  },
  { code: "333356335635cc63cc48cc84cca39a399a333333", columns: 8, rows: 6 },
  { code: "63335c635ccc48ccca399a333", columns: 5, rows: 6 },
  { code: "6333354c6335cccc61cccccc29cccca339c8a33339", columns: 7, rows: 7 },
  {
    code: "46333356333354cc6335cc6335ccccc25cccc61ccccca1cccccc29ccca339cccca339ca3333988a33339",
    columns: 14,
    rows: 7,
  },
  {
    code: "333335633356335cc633cc61cccc25ccc29cca1ccca339a3399a33333333",
    columns: 10,
    rows: 7,
  },
  { code: "633335c6335ccc61ccccc29ccca3399a3333", columns: 6, rows: 7 },
  {
    code: "63333354c63335cccc635cccccc48cccccca39cccca3339c8a333339",
    columns: 8,
    rows: 8,
  },
  {
    code: "4633333563333354cc63335cc63335ccccc635cccc635cccccc84cccccc48ccccca39cccccca39ccca3339cccca3339ca33333988a333339",
    columns: 16,
    rows: 8,
  },
  {
    code: "333333563333563335cc6333cc635cccc635ccc48cccc84cccca39cca39ccca3339a33399a3333333333",
    columns: 12,
    rows: 8,
  },
  {
    code: "6333335c63335ccc635ccccc48ccccca39ccca33399a33333",
    columns: 7,
    rows: 8,
  },
  {
    code: "633333354c633335cccc6335cccccc61cccccccc29cccccca339cccca33339c8a3333339",
    columns: 9,
    rows: 9,
  },
  {
    code: "463333335633333354cc633335cc633335ccccc6335cccc6335ccccccc25cccccc61ccccccca1cccccccc29ccccca339cccccca339ccca33339cccca33339ca333333988a3333339",
    columns: 18,
    rows: 9,
  },
  {
    code: "333333356333335633335cc63333cc6335cccc6335ccc61cccccc25ccccc29cccca1ccccca339cca339ccca33339a333399a333333333333",
    columns: 14,
    rows: 9,
  },
  {
    code: "63333335c633335ccc6335ccccc61ccccccc29ccccca339ccca333399a333333",
    columns: 8,
    rows: 9,
  },
];
/* cspell:enable */
