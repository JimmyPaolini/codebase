import { Injectable } from "@nestjs/common";

import type { ParsedCode } from "../code/code.types";

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

  // 🌎 Public Methods

  /**
   * Evaluates all formalized family predicates against the given Code and returns
   * the list of earned family names.
   */
  classify(code: ParsedCode): string[] {
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

    return families;
  }

  /**
   * Whether the meander consists only of parallel vertical lines across the
   * entire column width from the top border tick to the bottom border tick.
   */
  isBars(code: ParsedCode): boolean {
    if (code.levels < 2 || code.columns < 1) {
      return false;
    }

    const topRow = "4".repeat(code.columns);
    const middleRow = "c".repeat(code.columns);
    const bottomRow = "8".repeat(code.columns);
    const expected = topRow + middleRow.repeat(code.levels - 2) + bottomRow;

    return code.digits === expected;
  }

  /**
   * Whether the meander contains no connections between any lattice points,
   * rendering purely as bare dots.
   */
  isDots(code: ParsedCode): boolean {
    return code.digits.length > 0 && /^0+$/u.test(code.digits);
  }

  /**
   * Whether the meander consists only of parallel horizontal lines spanning
   * unbroken across every level of the band.
   */
  isLines(code: ParsedCode): boolean {
    return code.digits.length > 0 && /^3+$/u.test(code.digits);
  }

  /**
   * Whether the meander contains all possible horizontal and vertical
   * connections across the entire lattice grid.
   */
  isMesh(code: ParsedCode): boolean {
    if (code.levels < 2 || code.columns < 1) {
      return false;
    }

    const topRow = "7".repeat(code.columns);
    const middleRow = "f".repeat(code.columns);
    const bottomRow = "b".repeat(code.columns);
    const expected = topRow + middleRow.repeat(code.levels - 2) + bottomRow;

    return code.digits === expected;
  }
}
