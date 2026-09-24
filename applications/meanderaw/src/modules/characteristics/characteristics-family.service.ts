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

  /** Counts how many vertical pillars connect top and bottom rails continuously. */
  private countThroughPillars(
    grid: readonly string[],
    rows: number,
    columns: number,
  ): number {
    let count = 0;
    const topRow = grid[0] ?? "";
    const bottomRow = grid[rows - 1] ?? "";

    for (let column = 0; column < columns; column += 1) {
      const topCharacter = topRow[column] ?? "";
      const bottomCharacter = bottomRow[column] ?? "";
      const isTopJoint = /[765]/u.test(topCharacter);
      const isBottomJoint = /[ba9]/u.test(bottomCharacter);
      const isMiddlePillar = grid
        .slice(1, rows - 1)
        .every((row) => row[column] === "c");

      if (isTopJoint && isBottomJoint && isMiddlePillar) {
        count += 1;
      }
    }

    return count;
  }

  /** Whether horizontal row is a comb spine with vertical teeth. */
  private isHorizontalComb(grid: readonly string[], rows: number): boolean {
    for (let row = 0; row < rows; row += 1) {
      const rowChars = grid[row] ?? "";
      const isSpine = /^[37b65a9]+$/u.test(rowChars);
      const hasJoint = /[7b]/u.test(rowChars);

      if (isSpine && hasJoint) {
        const otherChars = grid.filter((_, index) => index !== row).join("");
        if (otherChars.length > 0 && /^[48c]+$/u.test(otherChars)) {
          return true;
        }
      }
    }

    return false;
  }

  /** Whether top and bottom rails interdigitate with vertical teeth. */
  private isReversingComb(
    grid: readonly string[],
    rows: number,
    digits: string,
  ): boolean {
    const topRow = grid[0] ?? "";
    const bottomRow = grid[rows - 1] ?? "";
    const columns = topRow.length;
    let hasDownTeeth = false;
    let hasUpTeeth = false;

    for (let column = 0; column < columns; column += 1) {
      const topCharacter = topRow[column] ?? "";
      const bottomCharacter = bottomRow[column] ?? "";
      hasDownTeeth ||= /[765]/u.test(topCharacter) && bottomCharacter === "8";
      hasUpTeeth ||= topCharacter === "4" && /[ba9]/u.test(bottomCharacter);
    }

    return (
      hasDownTeeth &&
      hasUpTeeth &&
      (rows <= 2
        ? !digits.includes("0")
        : /^c+$/u.test(grid.slice(1, rows - 1).join("")))
    );
  }

  /** Whether vertical column is a comb spine with horizontal teeth. */
  private isVerticalComb(grid: readonly string[], columns: number): boolean {
    for (let column = 0; column < columns; column += 1) {
      const columnChars = grid.map((row) => row[column] ?? "").join("");
      const isSpine = /^[cde65a9]+$/u.test(columnChars);
      const hasJoint = /[de]/u.test(columnChars);

      if (isSpine && hasJoint) {
        const otherChars = grid
          .map((row) => row.slice(0, column) + row.slice(column + 1))
          .join("");
        if (otherChars.length > 0 && /^[123]+$/u.test(otherChars)) {
          return true;
        }
      }
    }

    return false;
  }

  /** Converts CodeObject digits to an array of row strings. */
  private toGrid(code: CodeObject): string[] {
    const { columns, digits, rows } = code;
    return Array.from({ length: rows }, (_, row) =>
      digits.slice(row * columns, (row + 1) * columns),
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

    if (this.isComb(code)) {
      families.push("comb");
    }

    if (this.isArcade(code)) {
      families.push("arcade");
    }

    return families;
  }

  /**
   * Whether the meander consists of top and bottom rails connected by
   * continuous vertical through-pillars, forming architectural bays/arches.
   */
  isArcade(code: CodeObject): boolean {
    const { columns, digits, rows } = code;
    if (
      rows < 3 ||
      columns < 1 ||
      digits.length !== rows * columns ||
      this.isBars(code) ||
      this.isMesh(code) ||
      this.isComb(code)
    ) {
      return false;
    }

    const grid = this.toGrid(code);
    const topRow = grid[0] ?? "";
    const bottomRow = grid[rows - 1] ?? "";
    if (!/[765]/u.test(topRow) || !/[ba9]/u.test(bottomRow)) {
      return false;
    }

    return this.countThroughPillars(grid, rows, columns) >= 2;
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
   * Whether the meander consists of a spine with perpendicular teeth,
   * or alternating reversing top and bottom combs.
   */
  isComb(code: CodeObject): boolean {
    const { columns, digits, rows } = code;
    if (
      rows < 2 ||
      columns < 1 ||
      digits.length !== rows * columns ||
      this.isBars(code) ||
      this.isLines(code) ||
      this.isMesh(code)
    ) {
      return false;
    }

    const grid = this.toGrid(code);

    return (
      this.isVerticalComb(grid, columns) ||
      this.isHorizontalComb(grid, rows) ||
      this.isReversingComb(grid, rows, digits)
    );
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
}
