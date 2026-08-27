// cspell:ignore hxhxhx xhxhxh — mosaic tile identifiers, one letter per
// cell of the tile, from MOSAIC_MARK_LETTERS.
import { Injectable } from "@nestjs/common";

import { MOSAIC_MARK_LETTERS } from "./mosaic-motif.constants";

import type { MosaicPiece, MosaicTile } from "./mosaic-motif.types";

/**
 * The symmetries under which two `mosaic` tiles draw the same pattern, and
 * the identifier that names a tile independently of which of them produced
 * it. A tile repeats forever in both directions, so shifting its columns
 * only re-phases the same wallpaper; reversing its columns or flipping its
 * levels mirrors it. Enumerating every tile and keeping one representative
 * per symmetry class is what turns a combinatorial blow-up into a set small
 * enough to look through.
 */
@Injectable()
export class MosaicSymmetryService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Mirrors a tile top to bottom. A dash's anchor is the cell it is drawn
   * from, so a vertical dash — which reaches a level downward — has to be
   * re-anchored onto what was its lower half, while every other mark keeps
   * its own reflected cell.
   */
  private flipLevels(tile: MosaicTile): MosaicTile {
    const lastLevel = tile.rows - 2;

    return {
      ...tile,
      pieces: tile.pieces.map((piece) => ({
        ...piece,
        level:
          piece.kind === "vertical"
            ? lastLevel - piece.level - 1
            : lastLevel - piece.level,
      })),
    };
  }

  /**
   * Mirrors a tile left to right, re-anchoring a horizontal dash onto what
   * was its right-hand half for the same reason {@link flipLevels}
   * re-anchors a vertical one.
   */
  private reverseColumns(tile: MosaicTile): MosaicTile {
    const lastColumn = tile.columns - 1;

    return {
      ...tile,
      pieces: tile.pieces.map((piece) => ({
        ...piece,
        column:
          piece.kind === "horizontal"
            ? (lastColumn - piece.column - 1 + tile.columns) % tile.columns
            : lastColumn - piece.column,
      })),
    };
  }

  /** Shifts every column right by `shift`, wrapping around the tile. */
  private rotateColumns(tile: MosaicTile, shift: number): MosaicTile {
    return {
      ...tile,
      pieces: tile.pieces.map((piece) => ({
        ...piece,
        column: (piece.column + shift) % tile.columns,
      })),
    };
  }

  // 🌎 Public Methods

  /**
   * The identifier every tile in a symmetry class shares: the
   * lexicographically smallest {@link identify} string over the class. Two
   * tiles draw the same pattern exactly when their canonical identifiers
   * match, so this doubles as the deduplication key.
   */
  canonicalIdentifier(tile: MosaicTile): string {
    const identifiers: string[] = [];

    for (let shift = 0; shift < tile.columns; shift += 1) {
      const rotated = this.rotateColumns(tile, shift);
      const reversed = this.reverseColumns(rotated);

      identifiers.push(
        this.identify(rotated),
        this.identify(this.flipLevels(rotated)),
        this.identify(reversed),
        this.identify(this.flipLevels(reversed)),
      );
    }

    return identifiers.toSorted()[0] ?? this.identify(tile);
  }

  /** Every cell a piece covers, as `level * columns + column` indices. */
  coveredCells(piece: MosaicPiece, columns: number): number[] {
    const own = piece.level * columns + piece.column;

    if (piece.kind === "vertical") {
      return [own, (piece.level + 1) * columns + piece.column];
    }

    if (piece.kind === "horizontal") {
      return [own, piece.level * columns + ((piece.column + 1) % columns)];
    }

    return [own];
  }

  /**
   * Names a tile by its own cells, row-major from the top interior level:
   * one letter per cell from {@link MOSAIC_MARK_LETTERS}, plus `x` for a
   * cell covered by the other half of a dash anchored elsewhere. `x` sorts
   * after every mark letter on purpose, so the smallest identifier in a
   * symmetry class is the one that anchors its dashes earliest — `hxhxhx`
   * for the `dashes` tile rather than the `xhxhxh` its own mirror would
   * give. The string names every cell, so it is both a complete
   * description of the tile and safe to use as a filename.
   */
  identify(tile: MosaicTile): string {
    const cellCount = tile.columns * (tile.rows - 1);
    const letters = Array.from({ length: cellCount }, () => "x");

    for (const piece of tile.pieces) {
      letters[piece.level * tile.columns + piece.column] =
        MOSAIC_MARK_LETTERS[piece.kind];
    }

    return letters.join("");
  }
}
