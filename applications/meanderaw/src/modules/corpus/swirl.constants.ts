// ♟️ Constants

import type { CorpusEntry } from "./corpus.types";

/**
 * Part of `swirl`'s committed corpus: the meanders of that family that lie
 * beyond the reach of `EnumerationService`, preserved as Codes
 * extracted once from the drawings this repository used to commit as files.
 * See `CORPUS_BY_FAMILY` for how the boundary against the
 * enumerated half is drawn, and `CorpusService` for how these are
 * ingested.
 */
// 🎯 Hexadecimal lattice Codes rather than words, so the dictionaries are
// turned off across them — a run of hexadecimal digits occasionally spells one.
/* cspell:disable */
export const SWIRL_HARDCODED_MEANDERS: readonly CorpusEntry[] = [
  {
    code: "6333333563333333563333333563333335c633335cc6333335cc6333335cc633335ccc6335cccc63335cccc63335cccc6335ccccc65cccccc635cccccc635cccccc65ccccccc8ccccccc4cccccccc4ccccccc8ccccccca39cccccca9cccccca9cccccca39ccccca3339cccca339cccca339cccca3339ccca333339cca33339cca33339cca333339ca33333339a3333339a3333339a33333339",
    columns: 34,
    rows: 10,
  },
  {
    code: "63333335633333335c633335cc6333335ccc6335cccc63335ccccc65cccccc635ccccccc8ccccccc4ccccccca39cccccca9ccccca3339cccca339ccca333339cca33339ca33333339a3333339",
    columns: 17,
    rows: 10,
  },
  {
    code: "63333333563333333356333333335633333335c6333335cc63333335cc63333335cc6333335ccc63335cccc633335cccc633335cccc63335ccccc635cccccc6335cccccc6335cccccc635ccccccc4cccccccc65cccccccc65cccccccc4cccccccca9cccccccc8cccccccc8cccccccca9ccccccca339cccccca39cccccca39cccccca339ccccca33339cccca3339cccca3339cccca33339ccca3333339cca333339cca333339cca3333339ca333333339a33333339a33333339a333333339",
    columns: 38,
    rows: 11,
  },
  {
    code: "6333333356333333335c6333335cc63333335ccc63335cccc633335ccccc635cccccc6335ccccccc4cccccccc65cccccccca9cccccccc8ccccccca339cccccca39ccccca33339cccca3339ccca3333339cca333339ca333333339a33333339",
    columns: 19,
    rows: 11,
  },
  {
    code: "633333333563333333335633333333356333333335c63333335cc633333335cc633333335cc63333335ccc633335cccc6333335cccc6333335cccc633335ccccc6335cccccc63335cccccc63335cccccc6335ccccccc65cccccccc635cccccccc635cccccccc65ccccccccc8ccccccccc4cccccccccc4ccccccccc8ccccccccca39cccccccca9cccccccca9cccccccca39ccccccca3339cccccca339cccccca339cccccca3339ccccca333339cccca33339cccca33339cccca333339ccca33333339cca3333339cca3333339cca33333339ca3333333339a333333339a333333339a3333333339",
    columns: 42,
    rows: 12,
  },
  {
    code: "633333333563333333335c63333335cc633333335ccc633335cccc6333335ccccc6335cccccc63335ccccccc65cccccccc635ccccccccc8ccccccccc4ccccccccca39cccccccca9ccccccca3339cccccca339ccccca333339cccca33339ccca33333339cca3333339ca3333333339a333333339",
    columns: 21,
    rows: 12,
  },
  { code: "6563563565c8c4cc4c8ca39a9a9a39", columns: 10, rows: 4 },
  { code: "65635c8c4ca39a9", columns: 5, rows: 4 },
  {
    code: "63563356335635c4cc65cc65cc4cca9cc8cc8cca9ca339a39a39a339",
    columns: 14,
    rows: 5,
  },
  { code: "6356335c4cc65cca9cc8ca339a39", columns: 7, rows: 5 },
  {
    code: "633563335633356335c65cc635cc635cc65ccc8ccc4cccc4ccc8ccca39cca9cca9cca39ca3339a339a339a3339",
    columns: 18,
    rows: 6,
  },
  {
    code: "633563335c65cc635ccc8ccc4ccca39cca9ca3339a339",
    columns: 9,
    rows: 6,
  },
  {
    code: "6333563333563333563335c635cc6335cc6335cc635ccc4cccc65cccc65cccc4cccca9cccc8cccc8cccca9ccca339cca39cca39cca339ca33339a3339a3339a33339",
    columns: 22,
    rows: 7,
  },
  {
    code: "63335633335c635cc6335ccc4cccc65cccca9cccc8ccca339cca39ca33339a3339",
    columns: 11,
    rows: 7,
  },
  {
    code: "63333563333356333335633335c6335cc63335cc63335cc6335ccc65cccc635cccc635cccc65ccccc8ccccc4cccccc4ccccc8ccccca39cccca9cccca9cccca39ccca3339cca339cca339cca3339ca333339a33339a33339a333339",
    columns: 26,
    rows: 8,
  },
  {
    code: "6333356333335c6335cc63335ccc65cccc635ccccc8ccccc4ccccca39cccca9ccca3339cca339ca333339a33339",
    columns: 13,
    rows: 8,
  },
  {
    code: "633333563333335633333356333335c63335cc633335cc633335cc63335ccc635cccc6335cccc6335cccc635ccccc4cccccc65cccccc65cccccc4cccccca9cccccc8cccccc8cccccca9ccccca339cccca39cccca39cccca339ccca33339cca3339cca3339cca33339ca3333339a333339a333339a3333339",
    columns: 30,
    rows: 9,
  },
  {
    code: "633333563333335c63335cc633335ccc635cccc6335ccccc4cccccc65cccccca9cccccc8ccccca339cccca39ccca33339cca3339ca3333339a333339",
    columns: 15,
    rows: 9,
  },
];
/* cspell:enable */
