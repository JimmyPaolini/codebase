import { Injectable } from "@nestjs/common";

import type { CodeObject } from "../code/code.types";

/**
 * Classifies meanders into formal family categories based on structural
 * connectivity and edge patterns across the lattice grid.
 */
@Injectable()
export class CharacteristicsFamilyService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Generates the canonical digit string for an evenly spaced waterfall of a given
   * step size across the entire lattice.
   */
  private generateWaterfall(
    rows: number,
    columns: number,
    stepSize: number,
  ): string {
    const period = stepSize + 1;
    const strandCount = columns / period;

    let digits = "";
    for (let row = 0; row < rows; row += 1) {
      let unit: string;
      if (row === 0) {
        unit = `2${"3".repeat(stepSize - 1)}5`;
      } else if (row === rows - 1) {
        const base = `a${"3".repeat(stepSize - 1)}1`;
        const offset = (row * stepSize) % period;
        unit = this.shiftString(base, offset);
      } else {
        const base = `a${"3".repeat(stepSize - 1)}5`;
        const offset = (row * stepSize) % period;
        unit = this.shiftString(base, offset);
      }
      digits += unit.repeat(strandCount);
    }

    return digits;
  }

  /**
   * Cyclically shifts a string right by a given offset.
   */
  private shiftString(str: string, offset: number): string {
    const length = str.length;
    const normalizedOffset = ((offset % length) + length) % length;

    return (
      str.slice(length - normalizedOffset) +
      str.slice(0, length - normalizedOffset)
    );
  }

  // 🌎 Public Methods

  /**
   * Evaluates all formalized family predicates against the given Code and returns
   * the list of earned family names.
   */
  classify(code: CodeObject): string[] {
    const families: string[] = [];

    if (this.isBars(code)) {
      families.push("bars");
    }

    if (this.isDots(code)) {
      families.push("dots");
    }

    if (this.isLines(code)) {
      families.push("lines");
    }

    if (this.isMesh(code)) {
      families.push("mesh");
    }

    if (this.isWaterfalls(code)) {
      families.push("waterfalls");
    }

    return families;
  }

  /**
   * Whether the meander consists only of parallel vertical lines across the
   * entire column width from the top border tick to the bottom border tick.
   */
  isBars(code: CodeObject): boolean {
    if (code.rows < 2 || code.columns < 1) {
      return false;
    }

    const topRow = "4".repeat(code.columns);
    const middleRow = "c".repeat(code.columns);
    const bottomRow = "8".repeat(code.columns);
    const expected = topRow + middleRow.repeat(code.rows - 2) + bottomRow;

    return code.digits === expected;
  }

  /**
   * Whether the meander contains no connections between any lattice points,
   * rendering purely as bare dots.
   */
  isDots(code: CodeObject): boolean {
    return code.digits.length > 0 && /^0+$/u.test(code.digits);
  }

  /**
   * Whether the meander consists only of parallel horizontal lines spanning
   * unbroken across every level of the band.
   */
  isLines(code: CodeObject): boolean {
    return code.digits.length > 0 && /^3+$/u.test(code.digits);
  }

  /**
   * Whether the meander contains all possible horizontal and vertical
   * connections across the entire lattice grid.
   */
  isMesh(code: CodeObject): boolean {
    if (code.rows < 2 || code.columns < 1) {
      return false;
    }

    const topRow = "7".repeat(code.columns);
    const middleRow = "f".repeat(code.columns);
    const bottomRow = "b".repeat(code.columns);
    const expected = topRow + middleRow.repeat(code.rows - 2) + bottomRow;

    return code.digits === expected;
  }

  /**
   * Whether the meander consists of evenly spaced, downward zig-zagging waterfalls across the
   * vertical seam, stepping down row by row with no isolated dots.
   */
  isWaterfalls(code: CodeObject): boolean {
    if (code.columns < 2 || code.rows < 2) {
      return false;
    }

    for (let stepSize = 1; stepSize <= code.columns - 1; stepSize += 1) {
      if (code.columns % (stepSize + 1) === 0) {
        const expected = this.generateWaterfall(
          code.rows,
          code.columns,
          stepSize,
        );
        if (code.digits === expected) {
          return true;
        }
      }
    }

    return false;
  }
}
