// ♟️ Constants

import type {
  MosaicMarkKind,
  MosaicSubFamily,
  MosaicSubFamilyShape,
} from "./mosaic-motif.types";

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
 * The sub-family each mark kind names, which is what makes recognizing one
 * a predicate over a tile's own pieces rather than a lookup of its
 * identifier: a tile belongs to a sub-family exactly when every mark in it
 * is that sub-family's kind. Every kind names one and only one, so the map
 * is total in both directions — it is the inverse of
 * {@link MOSAIC_SUB_FAMILY_SHAPES}'s own `kind`, and
 * `MosaicSubFamilyService`'s round-trip test is what keeps the two
 * agreeing.
 */
export const MOSAIC_SUB_FAMILIES_BY_MARK_KIND: Record<
  MosaicMarkKind,
  MosaicSubFamily
> = {
  dot: "dots",
  horizontal: "dashes",
  line: "lines",
  vertical: "diamond",
};

/**
 * The tile each sub-family is named for, as the rule that builds it. A
 * region holds every tile its predicate accepts, so this is the region's
 * aligned representative rather than its only member.
 *
 * `dashes` spans two columns because a horizontal dash covers its own cell
 * and the one to its right, so a single-column tile can only express that
 * mark as the continuous rule `lines` draws. `diamond` steps two levels at
 * a time because a vertical dash covers its own cell and the one below it.
 */
export const MOSAIC_SUB_FAMILY_SHAPES: Record<
  MosaicSubFamily,
  MosaicSubFamilyShape
> = {
  dashes: { columns: 2, kind: "horizontal", levelStep: 1 },
  diamond: { columns: 1, kind: "vertical", levelStep: 2 },
  dots: { columns: 1, kind: "dot", levelStep: 1 },
  lines: { columns: 1, kind: "line", levelStep: 1 },
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

/**
 * Every named sub-family, as `readonly string[]` — mirroring
 * `SUPPORTED_TYPES`'s widened declaration for the same reason: it keeps
 * `Array.prototype.includes` usable with a plain `string` at the command
 * line boundary, where a raw flag value has to be narrowed before it can be
 * trusted.
 *
 * Read off {@link MOSAIC_SUB_FAMILY_SHAPES} rather than written out again,
 * so the names a caller may ask for are exactly the ones a tile can be
 * built for.
 */
export const SUPPORTED_SUB_FAMILIES: readonly string[] = Object.keys(
  MOSAIC_SUB_FAMILY_SHAPES,
);
