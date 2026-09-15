// ♟️ Constants

import type { SubFamily } from "./sub-family.types";

/**
 * Every named sub-family, as `readonly string[]` — widened rather than a
 * literal tuple so `Array.prototype.includes` stays usable with a plain
 * `string` where one arrives untyped, and so the entity's `simple-enum`
 * column can take it directly.
 *
 * It was read off a table of constructors — the rules that built each
 * sub-family's aligned tile — until that table and the service that read it
 * went, having had no production caller since the per-family procedural
 * pipeline retired. The names are written out here instead, in the same
 * order, and the `satisfies` check is what keeps them the names
 * {@link SubFamily} spells.
 */
export const SUPPORTED_SUB_FAMILIES: readonly string[] = [
  "bars",
  "dashes",
  "diamond",
  "dots",
  "lines",
  "mesh",
  "square",
  "zigzag",
] as const satisfies readonly SubFamily[];
