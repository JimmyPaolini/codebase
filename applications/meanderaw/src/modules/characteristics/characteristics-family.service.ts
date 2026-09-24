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

  /** Builds the expected Code digits for an evenly-spaced downward zig-zagging waterfall. */
  private expectedWaterfallsDigits(rows: number, columns: number): string {
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: columns }, () => "3"),
    );

    const firstRow = grid[0] ?? [];
    const lastRow = grid[rows - 1] ?? [];

    firstRow[0] = "2";
    firstRow[columns - 1] = "5";

    const mod = (n: number): number => ((n % columns) + columns) % columns;

    for (let r = 1; r < rows - 1; r += 1) {
      const row = grid[r] ?? [];
      row[mod(columns - r)] = "a";
      row[mod(columns - 1 - r)] = "5";
    }

    lastRow[mod(columns - (rows - 1))] = "a";
    lastRow[mod(columns - rows)] = "1";

    return grid.map((row) => row.join("")).join("");
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
   * Whether the meander consists of an evenly-spaced downward zig-zagging staircase
   * across the vertical seam, stepping down row by row across 2 or more columns.
   */
  isWaterfalls(code: CodeObject): boolean {
    if (code.columns < 2 || code.rows < 2) {
      return false;
    }

    return (
      code.digits === this.expectedWaterfallsDigits(code.rows, code.columns)
    );
  }
}
