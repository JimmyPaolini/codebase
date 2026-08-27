// ♟️ Constants

import type { MosaicMarkKind } from "./mosaic-motif.types";

/**
 * The letter {@link MosaicSymmetryService.identify} writes for each mark
 * kind. A cell covered by the other half of a dash anchored elsewhere gets
 * `x`, which is why no kind may claim that letter — and why every letter
 * here sorts before it, so a canonical identifier anchors its dashes as
 * early as it can.
 */
export const MOSAIC_MARK_LETTERS: Record<MosaicMarkKind, string> = {
  dot: "d",
  horizontal: "h",
  line: "l",
  vertical: "v",
};

/**
 * The most columns one `mosaic` repeat tile may span. The tile count grows
 * exponentially in this — at 8 rows, 1 column yields 216 distinct tiles and
 * 2 yields 1,098 — so the sweep stays bounded by capping it rather than by
 * sampling.
 */
export const MOSAIC_TILE_MAXIMUM_COLUMNS = 2;

/**
 * The smallest `rows` value a `mosaic` tile is worth enumerating at. Below
 * 4 rows the bar's interior is a single grid level, so the only tiles are
 * one dot or one line and there is nothing to permute.
 */
export const MOSAIC_TILE_MINIMUM_ROWS = 4;
