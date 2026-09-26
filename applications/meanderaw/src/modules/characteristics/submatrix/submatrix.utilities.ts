import type { Matrix, MatrixPointArm } from "../../matrix/matrix.types";

/**
 * Counts the points whose ink leaves by exactly `arms` — every named arm set
 * and every other arm clear — which is the whole of every 1×1 submatrix
 * characteristic: a bare point is `[]`, a corner two perpendicular arms, a
 * fork three, and a cross all four.
 */
export function countPointsWithExactArms(
  matrix: Matrix,
  arms: readonly MatrixPointArm[],
): number {
  const east = arms.includes("east");
  const north = arms.includes("north");
  const south = arms.includes("south");
  const west = arms.includes("west");
  let count = 0;

  for (const row of matrix) {
    for (const point of row) {
      if (
        point.east === east &&
        point.north === north &&
        point.south === south &&
        point.west === west
      ) {
        count += 1;
      }
    }
  }

  return count;
}
