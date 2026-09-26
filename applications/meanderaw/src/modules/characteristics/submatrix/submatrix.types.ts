// 🏷️ Types

/**
 * A position within a matrix, or a step between two positions, counted in
 * lattice points: `row` grows southward and `column` eastward.
 */
export interface SubmatrixOffset {
  readonly column: number;
  readonly row: number;
}
