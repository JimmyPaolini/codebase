import { MATRIX_POINT_ARMS } from "./submatrix.constants";

import type { Matrix } from "../../matrix/matrix.types";
import type { MatrixPointArm } from "../characteristics.types";

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
  let count = 0;

  for (const row of matrix) {
    for (const point of row) {
      if (MATRIX_POINT_ARMS.every((arm) => point[arm] === arms.includes(arm))) {
        count += 1;
      }
    }
  }

  return count;
}
