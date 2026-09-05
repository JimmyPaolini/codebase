// cspell:ignore dvvxxd dvvxxvvxxvvxxd hxxhhx hxxhhxxhhxxhhx dldldld — mosaic
// tile identifiers, one letter per cell of the tile, from
// MOSAIC_MARK_LETTERS in src/modules/mosaic-motif/mosaic-motif.constants.ts.

// 🏷️ Types

import type { MosaicMarkKind } from "../mosaic-motif/mosaic-motif.types";

/** One cell of the source pattern, by the lattice column it sits in and the interior level it sits on. */
export interface NegativeCell {
  readonly column: number;
  readonly level: number;
}

/**
 * One mark of a {@link NegativeColumnSource}'s repeating motif.
 *
 * It is every {@link MosaicMarkKind} but the horizontal dash, and that
 * exclusion is structural rather than a choice: a horizontal dash covers its
 * own cell and the one to its right, so a one-column tile has no second cell
 * for it to reach into. The `line` in its place is the degenerate horizontal
 * dash a one-column tile does admit — it chains with its own copy in every
 * following tile into one rule running the length of the band.
 */
export type NegativeColumnMark = Exclude<MosaicMarkKind, "horizontal">;

/**
 * The sources built from a one-column repeating motif, as opposed to the
 * two-column tiles {@link NegativeTileSource} names.
 *
 * These seven are one family rather than seven unrelated patterns, and the
 * shape of that family is what {@link NEGATIVE_COLUMN_MOTIFS} writes down:
 * a one-column source is a sequence of **openings** — a `dot` opening one
 * lattice level, a `vertical` opening two — separated by **closed rules**,
 * the `line` marks that wall a level off. Every lattice row of the drawing
 * is an unbroken rule wherever no `vertical` cuts it, which is why six of
 * the seven read as ruled bands.
 *
 * Two adjacent openings put two consecutive corridors in the same lattice
 * column, and that is exactly where an ink X-junction appears — so a motif
 * separating every opening by at least one rule branches without crossing,
 * and `grid`, whose motif is nothing but openings, crosses at every one of
 * them. That is measured rather than reasoned: the counts are asserted in
 * `negative-motif.service.unit.test.ts`.
 */
export type NegativeColumnSource =
  | "brick-upright"
  | "grid"
  | "ruled"
  | "ruled-closed"
  | "ruled-raised"
  | "ruled-spaced"
  | "ruled-tall";

/**
 * The modifier names the `negative` family draws a source for.
 *
 * It is deliberately narrower than `Modifier["name"]`: this family knows its
 * own modifiers and nothing about anybody else's, so a family added later
 * with a modifier of its own forces no edit here. What keeps it honest is
 * `negative-source.service.unit.test.ts`, which asserts these are exactly the
 * names `COMPATIBLE_MODIFIERS.negative` lists.
 */
export type NegativeModifierName =
  | Exclude<NegativeTileSource, "stair">
  | NegativeColumnSource;

/** Which way a source mark runs, and therefore which pair of neighboring cells it walls apart. */
export type NegativeOrientation = "horizontal" | "vertical";

/**
 * One lattice row of a `negative` drawing, and the run of lattice columns
 * one repeat unit draws corridors along it. Grouped into an object rather
 * than passed alongside the tile so the method stays inside the workspace's
 * parameter limit.
 */
export interface NegativeRowSpan {
  readonly from: number;
  readonly row: number;
  readonly to: number;
}

/**
 * Which `mosaic` pattern a `negative` drawing inverts.
 *
 * Ten of them, in two groups that differ in how the tile is built rather
 * than in how it is drawn: {@link NegativeColumnSource} is a one-column
 * repeating motif, and {@link NegativeTileSource} a two-column tile with a
 * rule of its own. `stair` is the one source no modifier selects — it is
 * what a `negative` drawn with no modifier at all inverts.
 *
 * Three of the ten come from the negative-space survey's shortlist in
 * `README.md` and are _branches only_: their negatives branch at every swept
 * row count and cross at none.
 *
 * - `stair` is `dvvxxd` → `dvvxxvvxxvvxxd`: two dots capping a staircase of
 *   vertical dashes. The shortlist's first entry and the highest-branching
 *   non-crossing pattern it found, so it is what `negative` draws with no
 *   modifier.
 * - `brick-staggered` is `hxxhhx` → `hxxhhxxhhxxhhx`: horizontal dashes in
 *   running bond, the shortlist's structurally simplest entry.
 * - `ruled` is `dld` → `dldldld`: one column alternating dot levels with the
 *   continuous rule, the shortlist's columns-1 entry.
 *
 * Four more invert a `MosaicSubFamily`'s own aligned tile, so the names the
 * `mosaic` family already recognizes are drawable as negatives rather than
 * only as mosaics: `brick-straight` inverts `dashes`, `grid` inverts `dots`,
 * `ruled-closed` inverts `lines`, and `brick-upright` inverts `diamond`.
 * The remaining three — `ruled-raised`, `ruled-spaced`, and `ruled-tall` —
 * are further members of `ruled`'s own one-column motif space.
 */
export type NegativeSource = "stair" | NegativeModifierName;

/** One inclusive run along a single lattice line, in lattice indices. */
export interface NegativeSpan {
  readonly from: number;
  readonly to: number;
}

/**
 * The sources built from a two-column tile rather than from a one-column
 * repeating motif.
 *
 * Two columns is where a horizontal dash becomes expressible, and the bond
 * it is laid in is the whole difference between the two `brick` sources: a
 * dash walls the lattice column it is anchored on and leaves the one it
 * reaches into open, so the anchors decide which columns carry corridors.
 * Alternating them by level puts a corridor either side of every course and
 * never two in a line — running bond, which branches without crossing.
 * Anchoring every course in the same column stacks those corridors into an
 * unbroken vertical line — stack bond, whose mortar is a grid and therefore
 * crosses.
 */
export type NegativeTileSource = "brick-staggered" | "brick-straight" | "stair";

/**
 * Which repeat unit of a source tile {@link NegativeMotifService.tilePath}
 * draws. Grouped into one object rather than passed alongside the tile so
 * the method stays inside the workspace's parameter limit, and so
 * `isLastUnit` reads the same here as it does in `MotifUnit` — which is the
 * other thing that method is called with, since a named drawing and an
 * enumerated one differ only in how their tile was arrived at.
 */
export interface NegativeTileUnit {
  readonly isLastUnit: boolean;
  readonly unitIndex: number;
}
