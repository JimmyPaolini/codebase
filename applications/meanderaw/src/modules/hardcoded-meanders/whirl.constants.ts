// ♟️ Constants

import type { HardcodedMeanderEntry } from "./hardcoded-meanders.types";

/**
 * Part of `whirl`'s committed corpus: the meanders of that family that lie
 * beyond the reach of `MeanderEnumerationService`, preserved as Codes
 * extracted once from the drawings this repository used to commit as files.
 * See `HARDCODED_MEANDERS_BY_FAMILY` for how the boundary against the
 * enumerated half is drawn, and `HardcodedMeandersService` for how these are
 * ingested.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const WHIRL_HARDCODED_MEANDERS: readonly HardcodedMeanderEntry[] = [
  {
    code: "63333333544633333335c6333335cccc6333335ccc63335cccccc63335ccccc635cccccccc635ccccccc69cccccccca5cccccccca39cccccca39ccccccca3339cccca3339ccccca333339cca333339cc8a33333339a333333398",
    columns: 20,
    rows: 10,
  },
  {
    code: "6333333335446333333335c63333335cccc63333335ccc633335cccccc633335ccccc6335cccccccc6335ccccccc65cccccccccc65ccccccccca9cccccccca9ccccccccca339cccccca339ccccccca33339cccca33339ccccca3333339cca3333339cc8a333333339a3333333398",
    columns: 22,
    rows: 11,
  },
  {
    code: "633333333354463333333335c633333335cccc633333335ccc6333335cccccc6333335ccccc63335cccccccc63335ccccccc635cccccccccc635ccccccccc69cccccccccca5cccccccccca39cccccccca39ccccccccca3339cccccca3339ccccccca333339cccca333339ccccca33333339cca33333339cc8a3333333339a33333333398",
    columns: 24,
    rows: 12,
  },
  { code: "63544635c69cca5c8a39a398", columns: 8, rows: 4 },
  { code: "6335446335c65cccc65ccca9cca9cc8a339a3398", columns: 10, rows: 5 },
  {
    code: "633354463335c635cccc635ccc69cccca5cccca39cca39cc8a3339a33398",
    columns: 12,
    rows: 6,
  },
  {
    code: "63333544633335c6335cccc6335ccc65cccccc65ccccca9cccca9ccccca339cca339cc8a33339a333398",
    columns: 14,
    rows: 7,
  },
  {
    code: "6333335446333335c63335cccc63335ccc635cccccc635ccccc69cccccca5cccccca39cccca39ccccca3339cca3339cc8a333339a3333398",
    columns: 16,
    rows: 8,
  },
  {
    code: "633333354463333335c633335cccc633335ccc6335cccccc6335ccccc65cccccccc65ccccccca9cccccca9ccccccca339cccca339ccccca33339cca33339cc8a3333339a33333398",
    columns: 18,
    rows: 9,
  },
];
/* cspell:enable */
