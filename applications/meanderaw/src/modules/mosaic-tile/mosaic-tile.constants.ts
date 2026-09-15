// ♟️ Constants

import type { MosaicSubFamily } from "./mosaic-tile.types";

/**
 * How many edges one `mosaic` tile may hold, which is the one knob the size
 * of its space depends on.
 *
 * A tile of `rows` by `columns` holds exactly `columns * (2 * rows - 3)`
 * edges, and every subset of them is a tile — so a shape holds
 * `2 ** edges` tiles and rows and columns are not independent knobs.
 * Capping each alone caps neither: 6 rows is fine, 6 columns is fine, and a
 * 6 by 6 tile is 2 ** 54 of them.
 *
 * Sixteen admits eleven shapes and 2,406 distinct tiles, which is a corpus
 * a person can look through. Twenty admits about 116,000, which is not.
 * Raising it is a one-line change with a visible effect on the counts
 * `mosaic-tiles.service.unit.test.ts` asserts, which is the point of making
 * it one number.
 *
 * It replaces a maximum column span, which was the knob while a degree
 * ceiling was doing most of the clamping. There is no degree ceiling now —
 * a point may carry any of the sixteen direction-bit patterns, junctions and
 * crossings included — so this is the only thing bounding the family, and it
 * has to be. At 6 rows adding one column multiplies the space by 2 ** 9,
 * which is about what removing the degree ceiling costs in total.
 */
export const MOSAIC_TILE_EDGE_BUDGET = 16;

/**
 * The smallest `rows` value a `mosaic` tile is worth enumerating at.
 *
 * Three, where a tile's interior is two grid levels — enough for a southward
 * edge to join them, which is the shallowest tile that can hold one. Below
 * it the interior is a single level with nothing under it, so the only
 * tiles are a bare point and the wrapped rule and there is nothing to
 * permute.
 *
 * It was 4 while the space at three rows held four tiles. The budget is
 * what makes three worth sweeping: it admits five column spans there,
 * against one at six rows, so the shallowest band is where the family is
 * widest.
 */
export const MOSAIC_TILE_MINIMUM_ROWS = 3;

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
 * {@link MosaicSubFamily} spells.
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
] as const satisfies readonly MosaicSubFamily[];

// 🚨 Errors

/**
 * Thrown when a grid of direction bits is not a tile: two adjoining points
 * disagree about the edge between them, a point at the first level claims a
 * `north` or one at the last claims a `south`, or the grid is not the size
 * its own `rows` and `columns` declare.
 *
 * Refusing these is what makes the bits a bijection with the drawing. A
 * disagreeing pair would have to render as a half-unit stub ending between
 * lattice lines, which `MeanderLatticeService` refuses to read back, and
 * which no charter invariant admits.
 */
export class MalformedMosaicTileError extends Error {
  constructor(reason: string) {
    super(`direction bits do not describe a mosaic tile: ${reason}`);
    this.name = "MalformedMosaicTileError";
  }
}

/**
 * Thrown when a tile shape holds more edges than
 * {@link MOSAIC_TILE_EDGE_BUDGET} admits.
 *
 * Refusing is the useful answer rather than a strict one. Enumeration walks
 * `2 ** edges` assignments, so a shape a little past the budget is not a
 * slow run but one that does not finish — and the budget exists precisely so
 * that the size of the space is a decision somebody made rather than a
 * surprise somebody discovers.
 */
export class OversizedMosaicTileError extends Error {
  constructor(shape: { columns: number; rows: number }, edges: number) {
    super(
      `a ${shape.rows}-row tile of ${shape.columns} columns holds ${edges} edges, past the budget of ${MOSAIC_TILE_EDGE_BUDGET}`,
    );
    this.name = "OversizedMosaicTileError";
  }
}
