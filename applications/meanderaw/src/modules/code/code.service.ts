import { Inject, Injectable } from "@nestjs/common";

import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";

import {
  HEXADECIMAL_DIGIT_PATTERN,
  InvalidCodeCharacterError,
  InvalidCodeLengthError,
} from "./code.constants";

import type {
  MosaicDirections,
  MosaicTile,
} from "../mosaic-tile/mosaic-tile.types";
import type { ParsedCode } from "./code.types";

/**
 * Owns a meander's Code: reading one, reading a lattice point's four
 * direction bits out of it, spelling a tile into one, and rotating its
 * phase.
 *
 * Encoding and decoding are two directions of a single conversion, so they
 * sit together rather than in two similarly named modules. {@link parse} and
 * {@link directionsAt} go from the string to the ink; {@link spell} goes
 * back; {@link tile} is {@link spell}'s inverse at the whole-tile
 * granularity, for the one caller that needs the tile vocabulary rather than
 * a point at a time.
 *
 * **A Code is read in place.** Every bit is decoded literally off its own
 * digit at `level * columns + column` rather than derived from a neighbor:
 * north and west are redundant with the previous point's south and east
 * under the lattice's own agreement invariant, but a Code spells all four
 * bits out per point regardless, and reading what is written is simpler than
 * re-deriving it and trusting an invariant nothing here has checked. There
 * is no intermediate grid — walking a Code is indexing a string, and the
 * array of arrays that used to stand between the two gave nothing the string
 * does not.
 *
 * **The spelling is deliberately redundant.** Four bits per point describes
 * `4 * columns * (rows - 1)` bits where a tile has only
 * `columns * (2 * rows - 3)` degrees of freedom, because every edge is
 * written twice, once at each end. That is the same redundancy
 * `MosaicTileService.assertWellFormed` checks, and paying it buys a Code
 * whose characters are the meander's own points: `0` is a dot, `3` a
 * horizontal straight, `c` a vertical straight, `5`/`6`/`9`/`a` the corners,
 * `7`/`b`/`d`/`e` the T-junctions, `f` a crossing. A reader decodes a Code
 * point by point without a table, which is the whole reason it reads this
 * way.
 */
@Injectable()
export class CodeService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicSymmetryService)
    private readonly mosaicSymmetryService: MosaicSymmetryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** One digit's four direction bits, worth `8` north, `4` south, `2` east, `1` west. */
  private decode(value: number): MosaicDirections {
    return {
      east: (value & 0b0010) !== 0,
      north: (value & 0b1000) !== 0,
      south: (value & 0b0100) !== 0,
      west: (value & 0b0001) !== 0,
    };
  }

  // 🌎 Public Methods

  /**
   * The four direction bits the point at `(level, column)` carries, read off
   * the single character at `level * columns + column`.
   *
   * A position outside the Code's own extent carries no ink at all. That is
   * not a tolerated fallback but what the lattice says: the levels above the
   * first and below the last are the band's two border rules, which are cap
   * ticks rather than points of the repeat, so there is nothing there for a
   * bit to be set on.
   */
  directionsAt(
    code: ParsedCode,
    level: number,
    column: number,
  ): MosaicDirections {
    const { columns, digits, levels } = code;

    if (level < 0 || level >= levels || column < 0 || column >= columns) {
      return { east: false, north: false, south: false, west: false };
    }

    return this.decode(
      Number.parseInt(digits[level * columns + column] ?? "0", 16),
    );
  }

  /**
   * Reads `code` at the given shape, refusing a length that disagrees with
   * `rows` and `columns` or a character outside the hexadecimal alphabet.
   *
   * Every character is checked here rather than where it is read, so a
   * malformed Code fails once at the boundary instead of producing an
   * `undefined` bit somewhere downstream.
   */
  parse(code: string, rows: number, columns: number): ParsedCode {
    const levels = rows - 1;

    if (code.length !== levels * columns) {
      throw new InvalidCodeLengthError(code, rows, columns);
    }

    for (const character of code) {
      if (!HEXADECIMAL_DIGIT_PATTERN.test(character)) {
        throw new InvalidCodeCharacterError(character, code);
      }
    }

    return { columns, digits: code, levels, rows };
  }

  /**
   * The Code shifted `shift` columns west, wrapping each level around its own
   * span — the same band cut at a different place.
   *
   * A Code repeats forever east and west, so a cyclic shift of its columns
   * re-phases the pattern without changing it: the point at
   * `(level, column)` moves to `(level, column - shift)` carrying all four of
   * its bits, which for a row-major reading is a rotation of each level's own
   * substring and nothing more. The bits travel unchanged because a shift
   * moves the whole lattice rather than the ink across it.
   *
   * A negative or oversized `shift` is taken modulo the column span rather
   * than refused, since every integer names a real phase.
   */
  rotate(code: ParsedCode, shift: number): ParsedCode {
    const { columns, digits, levels } = code;
    const offset = ((shift % columns) + columns) % columns;
    const rotated = Array.from({ length: levels }, (_unused, level) => {
      const row = digits.slice(level * columns, (level + 1) * columns);

      return row.slice(offset) + row.slice(0, offset);
    });

    return { ...code, digits: rotated.join("") };
  }

  /**
   * Names a tile by its own points: one hexadecimal character each, in
   * reading order, worth `8` for `north`, `4` for `south`, `2` for `east`
   * and `1` for `west`.
   *
   * It names a tile completely — the points determine every edge, since each
   * one owns its `east` and its `south` — so two tiles of one shape share a
   * string only when they are the same tile. It does *not* name the shape:
   * a Code carries no row count and no column span of its own, which is why
   * both travel beside it everywhere one is stored or read.
   */
  spell(tile: MosaicTile): string {
    return tile.points
      .flatMap((row) =>
        row.map((point) =>
          (
            (point.north ? 8 : 0) +
            (point.south ? 4 : 0) +
            (point.east ? 2 : 0) +
            (point.west ? 1 : 0)
          ).toString(16),
        ),
      )
      .join("");
  }

  /**
   * The Code every tile in a symmetry class shares: {@link spell} of the one
   * member `MosaicSymmetryService.canonicalTile` picks. Two tiles draw the
   * same pattern exactly when their canonical Codes match.
   *
   * It is not the deduplication key the enumeration folds on. That key has
   * to be readable by `MosaicTilesService`, which sits upstream of this
   * service, and `MosaicSymmetryService.edgeKey` separates two classes of
   * one shape exactly as this does — so how a Code is spelled stays a
   * question this module answers alone.
   */
  spellCanonical(tile: MosaicTile): string {
    return this.spell(this.mosaicSymmetryService.canonicalTile(tile));
  }

  /**
   * The tile a Code names, as the tile vocabulary rather than a point at a
   * time — {@link spell} read backwards.
   *
   * It is the one decoding a caller needs the whole shape for, and it is
   * deliberately the exception: reading a point's bits where they are needed
   * costs one index, while building a tile allocates one object per lattice
   * point. A caller measuring a Code reaches for {@link directionsAt}; a
   * caller asking a question the tile vocabulary already answers reaches for
   * this.
   */
  tile(code: ParsedCode): MosaicTile {
    const { columns, levels, rows } = code;

    return {
      columns,
      points: Array.from({ length: levels }, (_level, level) =>
        Array.from({ length: columns }, (_column, column) =>
          this.directionsAt(code, level, column),
        ),
      ),
      rows,
    };
  }
}
