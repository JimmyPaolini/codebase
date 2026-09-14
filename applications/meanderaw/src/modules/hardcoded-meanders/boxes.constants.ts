// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of `boxes`'s committed corpus: the meanders of that family that lie
 * beyond the reach of `MeanderEnumerationService`, preserved as Codes
 * extracted once from the drawings this repository used to commit as files.
 * See `HARDCODED_MEANDERS_BY_FAMILY` for how the boundary against the
 * enumerated half is drawn, and `HardcodedMeandersService` for how these are
 * ingested.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const BOXES_HARDCODED_MEANDERS: readonly HardcodedMeanderEntry[] = [
  {
    code: "23333333563333335cc633335cccc6335cccccc61ccccccca39ccccca3339ccca333339ca33333339",
    columns: 9,
    rows: 10,
  },
  {
    code: "633333354633333335633333335233333335c633335ccc6333335cc6333335c63333335ccc6335ccccc63335cccc63335ccc633335ccccc65ccccccc635cccccc635ccccc6335ccccccc8cccccccc29ccccccc4ccccccc61ccccccca39cccccca339cccccca9cccccca39ccccca3339cccca33339cccca339cccca3339ccca333339cca3333339cca33339cca333339ca33333339a333333318a3333339a33333339",
    columns: 36,
    rows: 10,
  },
  {
    code: "633333335633333331463333335633333335c6333335cc63333335cc633335cc6333335ccc63335cccc633335cccc6335cccc63335ccccc635cccccc6335cccccc65cccccc635ccccccc4cccccccc25ccccccc8ccccccca1ccccccca9ccccccca39cccccca39ccccca339ccccca339ccccca3339cccca3339ccca33339ccca33339ccca333339cca333339ca3333339ca33333398a33333339a33333339233333339",
    columns: 36,
    rows: 10,
  },
  {
    code: "2333333335633333335cc6333335cccc63335cccccc635cccccccc29ccccccca339ccccca33339ccca3333339ca333333339",
    columns: 10,
    rows: 11,
  },
  {
    code: "6333333354633333333563333333352333333335c6333335ccc63333335cc63333335c633333335ccc63335ccccc633335cccc633335ccc6333335ccccc635ccccccc6335cccccc6335ccccc63335ccccccc4ccccccccc61cccccccc65ccccccc635cccccccca9cccccccca39cccccccc8cccccccc29ccccccca339cccccca3339cccccca39cccccca339ccccca33339cccca333339cccca3339cccca33339ccca3333339cca33333339cca333339cca3333339ca333333339a3333333318a33333339a333333339",
    columns: 40,
    rows: 11,
  },
  {
    code: "6333333335633333333146333333356333333335c63333335cc633333335cc6333335cc63333335ccc633335cccc6333335cccc63335cccc633335ccccc6335cccccc63335cccccc635cccccc6335ccccccc65cccccccc635cccccccc4cccccccc25cccccccc8ccccccccca1cccccccca9ccccccca39ccccccca39ccccccca339cccccca339ccccca3339ccccca3339ccccca33339cccca33339ccca333339ccca333339ccca3333339cca3333339ca33333339ca333333398a333333339a3333333392333333339",
    columns: 40,
    rows: 11,
  },
  {
    code: "233333333356333333335cc63333335cccc633335cccccc6335cccccccc61ccccccccca39ccccccca3339ccccca333339ccca33333339ca3333333339",
    columns: 11,
    rows: 12,
  },
  {
    code: "63333333354633333333356333333333523333333335c63333335ccc633333335cc633333335c6333333335ccc633335ccccc6333335cccc6333335ccc63333335ccccc6335ccccccc63335cccccc63335ccccc633335ccccccc65ccccccccc635cccccccc635ccccccc6335ccccccccc8cccccccccc29ccccccccc4ccccccccc61ccccccccca39cccccccca339cccccccca9cccccccca39ccccccca3339cccccca33339cccccca339cccccca3339ccccca333339cccca3333339cccca33339cccca333339ccca33333339cca333333339cca3333339cca33333339ca3333333339a33333333318a333333339a3333333339",
    columns: 44,
    rows: 12,
  },
  {
    code: "63333333335633333333314633333333563333333335c633333335cc6333333335cc63333335cc633333335ccc6333335cccc63333335cccc633335cccc6333335ccccc63335cccccc633335cccccc6335cccccc63335ccccccc635cccccccc6335cccccccc65cccccccc635ccccccccc4cccccccccc25ccccccccc8ccccccccca1ccccccccca9ccccccccca39cccccccca39ccccccca339ccccccca339ccccccca3339cccccca3339ccccca33339ccccca33339ccccca333339cccca333339ccca3333339ccca3333339ccca33333339cca33333339ca333333339ca3333333398a3333333339a333333333923333333339",
    columns: 44,
    rows: 12,
  },
  { code: "44616525a9a18829", columns: 8, rows: 3 },
  { code: "6561442588a1a929", columns: 8, rows: 3 },
  { code: "654635635235c8cc29c4c61ca39a318a9a39", columns: 12, rows: 4 },
  { code: "635631465635c4cc25c8ca1ca98a39a39239", columns: 12, rows: 4 },
  { code: "2335635cc29ca339", columns: 4, rows: 5 },
  {
    code: "6354633563352335c4ccc61cc65c635cca9cca39cc8cc29ca339a3318a39a339",
    columns: 16,
    rows: 5,
  },
  {
    code: "6335633146356335c65cc635cc4cc25cc8ccca1cca9ca39ca398a339a3392339",
    columns: 16,
    rows: 5,
  },
  { code: "233356335cc61ccca39ca3339", columns: 5, rows: 6 },
  {
    code: "63354633356333523335c65ccc635cc635c6335ccc8cccc29ccc4ccc61ccca39cca339cca9cca39ca3339a33318a339a3339",
    columns: 20,
    rows: 6,
  },
  {
    code: "63335633314633563335c635cc6335cc65cc635ccc4cccc25ccc8ccca1ccca9ccca39cca39ca339ca3398a3339a333923339",
    columns: 20,
    rows: 6,
  },
  { code: "23333563335cc635cccc29ccca339ca33339", columns: 6, rows: 7 },
  {
    code: "633354633335633335233335c635ccc6335cc6335c63335ccc4ccccc61cccc65ccc635cccca9cccca39cccc8cccc29ccca339cca3339cca39cca339ca33339a333318a3339a33339",
    columns: 24,
    rows: 7,
  },
  {
    code: "633335633331463335633335c6335cc63335cc635cc6335ccc65cccc635cccc4cccc25cccc8ccccca1cccca9ccca39ccca39ccca339cca339ca3339ca33398a33339a33339233339",
    columns: 24,
    rows: 7,
  },
  {
    code: "2333335633335cc6335cccc61ccccca39ccca3339ca333339",
    columns: 7,
    rows: 8,
  },
  {
    code: "6333354633333563333352333335c6335ccc63335cc63335c633335ccc65ccccc635cccc635ccc6335ccccc8cccccc29ccccc4ccccc61ccccca39cccca339cccca9cccca39ccca3339cca33339cca339cca3339ca333339a3333318a33339a333339",
    columns: 28,
    rows: 8,
  },
  {
    code: "6333335633333146333356333335c63335cc633335cc6335cc63335ccc635cccc6335cccc65cccc635ccccc4cccccc25ccccc8ccccca1ccccca9ccccca39cccca39ccca339ccca339ccca3339cca3339ca33339ca333398a333339a3333392333339",
    columns: 28,
    rows: 8,
  },
  {
    code: "233333356333335cc63335cccc635cccccc29ccccca339ccca33339ca3333339",
    columns: 8,
    rows: 9,
  },
  {
    code: "63333354633333356333333523333335c63335ccc633335cc633335c6333335ccc635ccccc6335cccc6335ccc63335ccccc4ccccccc61cccccc65ccccc635cccccca9cccccca39cccccc8cccccc29ccccca339cccca3339cccca39cccca339ccca33339cca333339cca3339cca33339ca3333339a33333318a333339a3333339",
    columns: 32,
    rows: 9,
  },
  {
    code: "63333335633333314633333563333335c633335cc6333335cc63335cc633335ccc6335cccc63335cccc635cccc6335ccccc65cccccc635cccccc4cccccc25cccccc8ccccccca1cccccca9ccccca39ccccca39ccccca339cccca339ccca3339ccca3339ccca33339cca33339ca333339ca3333398a3333339a333333923333339",
    columns: 32,
    rows: 9,
  },
];
/* cspell:enable */
