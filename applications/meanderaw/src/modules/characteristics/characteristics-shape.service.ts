import { Injectable } from "@nestjs/common";

import type { ParsedCode } from "../code/code.types";
import type { UnitShapeCounts } from "./characteristics.types";

/** Internal helper method. */
@Injectable()
export class CharacteristicsShapeService {
  // 🏗 Dependency Injection
  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods
  /** Internal helper method. */
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

  /** Internal helper method. */
  private tallyIsolatedShapes(
    windowString: string,
    counts: UnitShapeCounts,
  ): void {
    switch (windowString) {
      case "9a56": {
        counts.plusCount += 1;
        break;
      }
      case "0021":
      case "2100": {
        counts.horizontalDashCount += 1;
        break;
      }
      case "40a1":
      case "0429":
      case "2508":
      case "6180": {
        counts.lCount += 1;
        break;
      }
      case "44a9":
      case "61a1":
      case "2529":
      case "6588": {
        counts.uCount += 1;
        break;
      }
      case "65a9": {
        counts.oCount += 1;
        break;
      }
      case "0408":
      case "4080": {
        counts.verticalDashCount += 1;
        break;
      }
      case "2121":
      case "4488": {
        counts.shapeICount += 1;
        break;
      }
    }
  }

  /** Internal helper method. */
  // 🌎 Public Methods

  public tallyUnitShapes(code: ParsedCode): UnitShapeCounts {
    const counts: UnitShapeCounts = {
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

    for (let level = 0; level < code.levels - 1; level += 1) {
      for (let column = 0; column < code.columns; column += 1) {
        const tlString = code.digits[level * code.columns + column] ?? "0";
        const trString =
          code.digits[level * code.columns + ((column + 1) % code.columns)] ??
          "0";
        const blString =
          code.digits[(level + 1) * code.columns + column] ?? "0";
        const brString =
          code.digits[
            (level + 1) * code.columns + ((column + 1) % code.columns)
          ] ?? "0";

        const windowString = tlString + trString + blString + brString;
        this.tallyIsolatedShapes(windowString, counts);

        const tl = Number.parseInt(tlString, 16);
        const tr = Number.parseInt(trString, 16);
        const bl = Number.parseInt(blString, 16);
        const br = Number.parseInt(brString, 16);
        this.tallyEmbeddedShapes({ bl, br, tl, tr }, counts);
      }
    }

    return counts;
  }
}
