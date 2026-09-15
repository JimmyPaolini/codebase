// ♟️ Constants

/**
 * The shallowest band worth enumerating, and the one number this sweep adds
 * to the edge budget it otherwise inherits whole.
 *
 * Three, for the reason `TILE_MINIMUM_ROWS` is three: a two-row band's
 * interior is a single level with nothing under it, so no southward edge
 * exists anywhere in it and the whole space is the horizontal necklaces. Not
 * one family's defining combination is about a repeat like that — every rule
 * `ClassificationService` states either counts a junction, a loop, or
 * a piece, and a band with no vertical ink can close nothing and fork
 * nowhere — so a sweep that included two rows would be spending its widest
 * shape on the corner of the space no family lives in. The budget alone
 * admits sixteen columns there, which is 2 ** 16 assignments folded through
 * a symmetry group of 64 elements, and the largest single cost in the sweep
 * by some distance.
 *
 * There is deliberately no maximum here to match it. The budget decides the
 * deepest band, which is nine rows at one column — see
 * `EnumerationService.shapes` — and a second number saying so would
 * be a number that could disagree with it.
 */
export const SWEEP_MINIMUM_ROWS = 3;

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
 * `tile-enumeration.service.unit.test.ts` asserts, which is the point of making
 * it one number.
 *
 * It replaces a maximum column span, which was the knob while a degree
 * ceiling was doing most of the clamping. There is no degree ceiling now —
 * a point may carry any of the sixteen direction-bit patterns, junctions and
 * crossings included — so this is the only thing bounding the family, and it
 * has to be. At 6 rows adding one column multiplies the space by 2 ** 9,
 * which is about what removing the degree ceiling costs in total.
 */
export const EDGE_BUDGET = 16;

/**
 * Thrown when a tile shape holds more edges than
 * {@link EDGE_BUDGET} admits.
 *
 * Refusing is the useful answer rather than a strict one. Enumeration walks
 * `2 ** edges` assignments, so a shape a little past the budget is not a
 * slow run but one that does not finish — and the budget exists precisely so
 * that the size of the space is a decision somebody made rather than a
 * surprise somebody discovers.
 */
export class OversizedTileError extends Error {
  constructor(shape: { columns: number; rows: number }, edges: number) {
    super(
      `a ${shape.rows}-row tile of ${shape.columns} columns holds ${edges} edges, past the budget of ${EDGE_BUDGET}`,
    );
    this.name = "OversizedTileError";
  }
}
