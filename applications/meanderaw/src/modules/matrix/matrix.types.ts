// 🏷️ Types

/**
 * A 2D grid of lattice points representing a meander pattern, indexed as
 * `[row][column]`.
 */
export type Matrix = readonly (readonly MatrixPoint[])[];

/**
 * The four directional ink connections at a single lattice point in a 2D matrix:
 * whether ink travels north, south, east, or west.
 */
export interface MatrixPoint {
  readonly east: boolean;
  readonly north: boolean;
  readonly south: boolean;
  readonly west: boolean;
}

/**
 * A kernel window extracted from a larger Matrix during sliding window operations.
 */
export interface MatrixWindow {
  readonly column: number;
  readonly height: number;
  readonly matrix: Matrix;
  readonly row: number;
  readonly width: number;
}
