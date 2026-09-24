import { Inject, Injectable } from "@nestjs/common";

import { BARE_MATRIX_POINT } from "../matrix/matrix.constants";
import { MatrixService } from "../matrix/matrix.service";

import { ISOLATED_SHAPE_MAP } from "./characteristics.constants";

import type { Matrix, MatrixPoint, Submatrix } from "../matrix/matrix.types";
import type { UnitShapeCounts } from "./characteristics.types";

/**
 * Tallies unit shape occurrences (plus, dashes, L, U, O, I, and embedded motifs)
 * across 2x2 sliding window kernels of a meander Matrix.
 */
@Injectable()
export class CharacteristicsShapeService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MatrixService)
    private readonly matrixService: MatrixService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Converts a MatrixPoint into its 4-bit integer representation (north=8, south=4, east=2, west=1).
   */
  private pointToDigit(point: MatrixPoint): number {
    return (
      (point.north ? 8 : 0) +
      (point.south ? 4 : 0) +
      (point.east ? 2 : 0) +
      (point.west ? 1 : 0)
    );
  }

  /**
   * Tallies embedded O and U shapes from 2x2 window point values.
   */
  private tallyEmbeddedShapes(
    digits: { bl: number; br: number; tl: number; tr: number },
    counts: UnitShapeCounts,
  ): void {
    const { bl, br, tl, tr } = digits;
    if (
      (tl & 6) === 6 &&
      (tr & 5) === 5 &&
      (bl & 10) === 10 &&
      (br & 9) === 9
    ) {
      counts.embeddedOCount += 1;
    }

    if (
      ((tl & 4) === 4 &&
        (tr & 4) === 4 &&
        (bl & 10) === 10 &&
        (br & 9) === 9) ||
      ((tl & 6) === 6 && (tr & 5) === 5 && (bl & 8) === 8 && (br & 8) === 8) ||
      ((tl & 6) === 6 &&
        (tr & 1) === 1 &&
        (bl & 10) === 10 &&
        (br & 1) === 1) ||
      ((tl & 2) === 2 && (tr & 5) === 5 && (bl & 2) === 2 && (br & 9) === 9)
    ) {
      counts.embeddedUCount += 1;
    }
  }

  /**
   * Tallies isolated unit shapes from a 4-character hexadecimal window string.
   */
  private tallyIsolatedShapes(
    windowString: string,
    counts: UnitShapeCounts,
  ): void {
    const key = ISOLATED_SHAPE_MAP[windowString];
    if (key) {
      counts[key] += 1;
    }
  }

  /**
   * Processes a single 2x2 submatrix kernel and updates the running shape counts.
   */
  private tallySubmatrix(submatrix: Submatrix, counts: UnitShapeCounts): void {
    const topRow = submatrix.matrix[0];
    const bottomRow = submatrix.matrix[1];
    if (!topRow || !bottomRow) {
      return;
    }

    const tlPoint = topRow[0] ?? BARE_MATRIX_POINT;
    const trPoint = topRow[1] ?? BARE_MATRIX_POINT;
    const blPoint = bottomRow[0] ?? BARE_MATRIX_POINT;
    const brPoint = bottomRow[1] ?? BARE_MATRIX_POINT;

    const tl = this.pointToDigit(tlPoint);
    const tr = this.pointToDigit(trPoint);
    const bl = this.pointToDigit(blPoint);
    const br = this.pointToDigit(brPoint);

    const windowString =
      tl.toString(16) + tr.toString(16) + bl.toString(16) + br.toString(16);

    this.tallyIsolatedShapes(windowString, counts);
    this.tallyEmbeddedShapes({ bl, br, tl, tr }, counts);
  }

  // 🌎 Public Methods

  /**
   * Tallies unit shape occurrences (isolated and embedded) across all 2x2 sliding submatrix
   * kernels of the meander Matrix.
   */
  public tallyUnitShapes(matrix: Matrix): UnitShapeCounts {
    const counts: UnitShapeCounts = {
      arcadePillarCount: 0,
      bifurcationCount: 0,
      combSpineCount: 0,
      embeddedOCount: 0,
      embeddedUCount: 0,
      horizontalDashCount: 0,
      lCount: 0,
      oCount: 0,
      plusCount: 0,
      shapeICount: 0,
      uCount: 0,
      verticalDashCount: 0,
    };

    const items = this.matrixService.submatrices(matrix, 2, 2);
    for (const item of items) {
      this.tallySubmatrix(item, counts);
    }

    return counts;
  }
}
