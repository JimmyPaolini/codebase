import { Injectable } from "@nestjs/common";

import {
  HEXADECIMAL_DIGIT_PATTERN,
  InvalidCodeCharacterError,
  InvalidCodeLengthError,
} from "./meander-decoding.constants";

import type {
  MeanderPointDirections,
  MeanderPointGrid,
} from "./meander-decoding.types";

/**
 * Decodes a Code string into a per-point direction-bit grid: the one step
 * every family's drawing now starts from, in place of nine separate
 * per-family procedural motif services.
 *
 * A Code is one hexadecimal character per interior lattice point, worth `8`
 * north, `4` south, `2` east, `1` west — the exact encoding
 * `LatticeIdentificationService.identify` already spells a filename in,
 * read back here rather than restated. Every bit is decoded literally off
 * its own digit rather than derived from a neighbor: north and west are
 * redundant with the previous point's south and east under the lattice's
 * own agreement invariant, but a Code spells all four bits out per point
 * regardless, and decoding what is actually written is simpler than
 * re-deriving it and trusting that invariant holds for a Code nothing here
 * has validated.
 */
@Injectable()
export class MeanderDecodingService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** One digit's four direction bits, worth `8` north, `4` south, `2` east, `1` west. */
  private point(digit: string, code: string): MeanderPointDirections {
    if (!HEXADECIMAL_DIGIT_PATTERN.test(digit)) {
      throw new InvalidCodeCharacterError(digit, code);
    }

    const value = Number.parseInt(digit, 16);

    return {
      east: (value & 0b0010) !== 0,
      north: (value & 0b1000) !== 0,
      south: (value & 0b0100) !== 0,
      west: (value & 0b0001) !== 0,
    };
  }

  // 🌎 Public Methods

  /**
   * Decodes `code` into a `rows - 1` by `columns` grid of direction bits,
   * refusing a length that disagrees with `rows` and `columns` or a
   * character outside the hexadecimal alphabet.
   */
  decode(code: string, rows: number, columns: number): MeanderPointGrid {
    const levels = rows - 1;

    if (code.length !== levels * columns) {
      throw new InvalidCodeLengthError(code, rows, columns);
    }

    const points = Array.from(code, (digit) => this.point(digit, code));

    return Array.from({ length: levels }, (_unused, level) =>
      points.slice(level * columns, (level + 1) * columns),
    );
  }
}
