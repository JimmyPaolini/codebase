// ♟️ Constants

import type {
  MosaicBuildableSubFamily,
  MosaicSubFamilyShape,
} from "./mosaic-motif.types";

/**
 * The tile each sub-family is named for, as the rule that builds it. A
 * region holds every tile its predicate accepts, so this is the region's
 * aligned representative rather than its only member.
 *
 * `bars` and `diamond` are the same direction at two level steps, which is
 * the whole difference between an unbroken vertical bar and a dashed one.
 *
 * `MosaicSubFamilyService`'s round-trip test is what keeps a shape and the
 * predicate that recognizes it agreeing.
 */
export const MOSAIC_SUB_FAMILY_SHAPES: Record<
  MosaicBuildableSubFamily,
  MosaicSubFamilyShape
> = {
  bars: { columns: 1, direction: "south", levelStep: 1 },
  dashes: { columns: 2, direction: "east", levelStep: 1 },
  diamond: { columns: 1, direction: "south", levelStep: 2 },
  dots: { columns: 1, direction: undefined, levelStep: 1 },
  lines: { columns: 1, direction: "east", levelStep: 1 },
};

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
 * The deepest band the `mosaic` family is drawn in, and so the highest
 * `rows` value a tile is enumerated at.
 *
 * Six, where every other family runs to the shared `MAXIMUM_VALUE` of 12.
 * {@link MOSAIC_TILE_EDGE_BUDGET} would admit a little past it on its own —
 * a one-column tile stays inside the budget out to 9 rows — but a family
 * that ran deeper at one column than at any other would be describing its
 * own ceiling with two numbers that disagree, and the sweep would file a
 * `9-rows` directory holding a single column and nothing beside it.
 *
 * It is a budget rather than a structural claim: nothing about the geometry
 * fails at 7 rows, which is why this is not the opposite number of
 * `STRUCTURAL_MINIMUM_ROWS`. It is enforced at the generation seam through
 * `FAMILY_MAXIMUM_ROWS` all the same, so a `mosaic` at 7 rows is refused
 * rather than drawn outside the corpus the charter gates — the property
 * issue #507 lived in the absence of.
 *
 * **The `negative` permutation half stops here too**, which is why this
 * constant is read outside the `mosaic` modules. That half used to stop one
 * row lower, so every drawing in it inverted a tile the `mosaic` half had
 * already committed; it now runs to the same 6, so its deepest row count
 * inverts a seven-row source that is enumerable but not committed and the
 * corridor-identity gate covers rows 3 through 5 of it rather than all of
 * it. `NegativeSourceService` builds source tiles from a rule rather than
 * from the enumeration, which is the same reason the named `negative`
 * family already draws out to 12 rows with no committed source at all.
 */
export const MOSAIC_TILE_MAXIMUM_ROWS = 6;

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
