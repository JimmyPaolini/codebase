// cspell:ignore ddddhxddhxhx — a mosaic tile identifier, one letter per
// point of the tile, from MosaicSymmetryService.identify.
import { Inject, Injectable } from "@nestjs/common";

import { MOSAIC_SUB_FAMILY_SHAPES } from "./mosaic-motif.constants";
import { MosaicTileService } from "./mosaic-tile.service";

import type {
  MosaicDirections,
  MosaicSubFamily,
  MosaicTile,
} from "./mosaic-motif.types";

/**
 * Recognizes the named regions of the `mosaic` family's unit space, and
 * builds the tile each one is named for.
 *
 * `MosaicTilesService` materializes that space as thousands of tiles, each
 * one correctly but anonymously identified — `ddddhxddhxhx` names a tile
 * precisely and tells a reader nothing. A sub-family is the missing half: a
 * name for a whole region of the space, recognized from a tile's own
 * direction bits. Recognition is deliberately not a list of known
 * identifiers, so it keeps working at row and column counts nobody has
 * enumerated and survives any change to the enumeration's bounds.
 *
 * The predicate is the same shape for all four: every point of the tile is
 * reached the same way. A tile mixing them — which is nearly all of them —
 * belongs to none and stays unnamed.
 */
@Injectable()
export class MosaicSubFamilyService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether every point of a tile satisfies `predicate`. */
  private everyPoint(
    tile: MosaicTile,
    predicate: (directions: MosaicDirections) => boolean,
  ): boolean {
    return tile.points.every((row) => row.every((point) => predicate(point)));
  }

  // 🌎 Public Methods

  /**
   * The sub-family a tile belongs to, or `undefined` when it belongs to
   * none.
   *
   * The four predicates are checked in an order that cannot matter: a tile
   * of bare points carries no edge at all, so it satisfies neither of the
   * edge-direction predicates, and a horizontal region and a vertical one
   * are disjoint for the same reason. `lines` and `dashes` are the same
   * predicate at different column spans, because at one column an eastward
   * edge wraps onto its own point and draws a continuous rule rather than a
   * dash.
   */
  classify(tile: MosaicTile): MosaicSubFamily | undefined {
    if (
      this.everyPoint(tile, (point) => this.mosaicTileService.isBare(point))
    ) {
      return "dots";
    }

    if (this.everyPoint(tile, (point) => point.east || point.west)) {
      return tile.columns === 1 ? "lines" : "dashes";
    }

    if (this.everyPoint(tile, (point) => point.north || point.south)) {
      return "diamond";
    }

    return undefined;
  }

  /**
   * The tile a sub-family is named for at `rows`, or `undefined` where the
   * sub-family names no tile at that row count at all — `diamond` over an
   * interior with an odd number of levels, and any sub-family below one
   * interior level.
   *
   * A region can hold many tiles: `dashes` covers every arrangement of
   * eastward edges, staggered ones included. This returns the aligned
   * representative, every edge anchored in the tile's first column, which
   * is the one the region is named after. {@link classify} names it back.
   */
  tile(subFamily: MosaicSubFamily, rows: number): MosaicTile | undefined {
    const { columns, direction, levelStep } =
      MOSAIC_SUB_FAMILY_SHAPES[subFamily];
    const levels = rows - 1;

    if (levels < levelStep || levels % levelStep !== 0) {
      return undefined;
    }

    const isAnchored = (level: number): boolean => level % levelStep === 0;
    const anchors = (
      level: number,
      column: number,
      own: "east" | "south",
    ): boolean => direction === own && column === 0 && isAnchored(level);

    return this.mosaicTileService.build(
      { columns, rows },
      {
        horizontal: Array.from({ length: levels }, (_level, level) =>
          Array.from({ length: columns }, (_column, column) =>
            anchors(level, column, "east"),
          ),
        ),
        vertical: Array.from(
          { length: Math.max(levels - 1, 0) },
          (_level, level) =>
            Array.from({ length: columns }, (_column, column) =>
              anchors(level, column, "south"),
            ),
        ),
      },
    );
  }
}
