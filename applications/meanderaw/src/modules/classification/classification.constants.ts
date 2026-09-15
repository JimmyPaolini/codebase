// ♟️ Constants

import { TILE_MINIMUM_ROWS } from "../enumeration/enumeration.constants";

import type { MeanderType } from "./classification.types";

/**
 * Every family a meander may be classified into, declared
 * `readonly string[]` rather than a literal tuple so that
 * `Array.prototype.includes` stays usable with a plain `string` where one
 * arrives untyped — the `satisfies` check below is the only place a typo
 * could surface.
 *
 * **The order is load-bearing, and it is a reading order rather than an
 * alphabetical or a historical one.** It runs from the families whose motif
 * is a single line — `snake` through `boxes` — into the four that break one
 * of the charter's negotiable invariants, and ends at `mosaic`, whose
 * enumerated tiles outnumber every other family put together. It is the
 * order the `family` column's own enum constraint declares, and the order a
 * page built from the database lays its families out in.
 *
 * It moved here from the retired `meander-generation` module with
 * {@link MeanderType} itself: the list once named the nine motif services a
 * drawing could be dispatched to plus `mosaic`, and now names the ten
 * combinations `ClassificationService` tests a structure against.
 */
export const SUPPORTED_TYPES: readonly string[] = [
  "snake",
  "chain",
  "swirl",
  "whirl",
  "boxes",
  "branch",
  "cross",
  "parallel",
  "negative",
  "mosaic",
] satisfies readonly MeanderType[];

/**
 * The shallowest band each family's own structure can exist in, which is the
 * one value a family rule reads that is a number rather than a predicate.
 *
 * `boxes`'s spiral traces `rows - 1` grid levels inward, so below 3 rows its
 * first move collapses to a zero-length segment. `chain` and `snake` share a
 * zigzag needing a genuine middle row distinct from its two neighbors, which
 * 4 rows is the shallowest band to hold. `swirl` and `whirl` are nested
 * spirals, verified against reference geometry from 4 rows up. `cross` needs
 * both a horizontal and a vertical run to cross at all, with a level clear
 * above and below each. `parallel`'s floor is on the family rather than on
 * one drawing: a band of one row admits a single ply, and a family whose
 * whole claim is `N` strands running alongside one another has no room to
 * put a second beside the first. `mosaic` reads
 * {@link TILE_MINIMUM_ROWS} rather than restating it.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderType, number> = {
  boxes: 3,
  branch: 3,
  chain: 4,
  cross: 6,
  mosaic: TILE_MINIMUM_ROWS,
  negative: 3,
  parallel: 2,
  snake: 4,
  swirl: 4,
  whirl: 4,
};

// 🌱 Each family's defining combination is a predicate rather than a value,
// so the ten of them live in `ClassificationService.rules` beside the
// helpers they read — the same place `SubFamilyService` keeps the eight
// sub-family rules, and for the same reason.
