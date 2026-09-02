// cspell:ignore ddddhxddhxhx — a mosaic tile identifier, one letter per
// cell of the tile, from MOSAIC_MARK_LETTERS.
import { Injectable } from "@nestjs/common";

import {
  MOSAIC_SUB_FAMILIES_BY_MARK_KIND,
  MOSAIC_SUB_FAMILY_SHAPES,
} from "./mosaic-motif.constants";

import type { MosaicSubFamily, MosaicTile } from "./mosaic-motif.types";

/**
 * Recognizes the named regions of the `mosaic` family's unit space, and
 * builds the tile each one is named for.
 *
 * `MosaicTilesService` materialized that space as thousands of tiles, each
 * one correctly but anonymously identified — `ddddhxddhxhx` names a tile
 * precisely and tells a reader nothing. A sub-family is the missing half:
 * a name for a whole region of the space, recognized from a tile's own
 * pieces. Recognition is deliberately not a list of known identifiers, so
 * it keeps working at row and column counts nobody has enumerated and
 * survives any change to the enumeration's bounds.
 *
 * The predicate is the same for all four: a tile belongs to a sub-family
 * when every one of its marks is that sub-family's own mark kind. A tile
 * mixing kinds — which is nearly all of them — belongs to none and stays
 * unnamed.
 */
@Injectable()
export class MosaicSubFamilyService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * The sub-family a tile belongs to, or `undefined` when it belongs to
   * none. A tile carrying no marks is unnamed too: "every mark is a dot" is
   * vacuously true of it, and naming a tile that draws nothing would be a
   * worse answer than admitting it has no name.
   */
  classify(tile: MosaicTile): MosaicSubFamily | undefined {
    const [firstPiece] = tile.pieces;

    if (!firstPiece) {
      return undefined;
    }

    if (tile.pieces.some((piece) => piece.kind !== firstPiece.kind)) {
      return undefined;
    }

    return MOSAIC_SUB_FAMILIES_BY_MARK_KIND[firstPiece.kind];
  }

  /**
   * The tile a sub-family is named for at `rows`, or `undefined` where the
   * sub-family names no tile at that row count at all — `diamond` over an
   * interior with an odd number of levels, and any sub-family below one
   * interior level.
   *
   * A region can hold many tiles: `dashes` covers every arrangement of
   * horizontal dashes, staggered ones included. This returns the aligned
   * representative, every mark anchored in the tile's first column, which
   * is the one the region is named after. {@link classify} names it back.
   */
  tile(subFamily: MosaicSubFamily, rows: number): MosaicTile | undefined {
    const { columns, kind, levelStep } = MOSAIC_SUB_FAMILY_SHAPES[subFamily];
    const levels = rows - 1;

    if (levels < levelStep || levels % levelStep !== 0) {
      return undefined;
    }

    return {
      columns,
      pieces: Array.from({ length: levels / levelStep }, (_value, index) => ({
        column: 0,
        kind,
        level: index * levelStep,
      })),
      rows,
    };
  }
}
