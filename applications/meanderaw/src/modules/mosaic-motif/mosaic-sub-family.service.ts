import { Inject, Injectable } from "@nestjs/common";

import { MOSAIC_SUB_FAMILY_SHAPES } from "./mosaic-motif.constants";
import { MosaicTileService } from "./mosaic-tile.service";

import type {
  MosaicBuildableSubFamily,
  MosaicTile,
} from "./mosaic-motif.types";

/**
 * Builds the tile each named region of the `mosaic` family's unit space is
 * named for.
 *
 * This is the constructor into the space; `MosaicNamingService` is the
 * predicate over it. Keeping them apart is what lets `diamond` and `split`
 * both survive as names for the same shape: `split` is a modifier that
 * constructs one, `diamond` a rule that recognizes one, and neither is
 * derivable from the other.
 *
 * A region holds many tiles, so what is built here is the region's aligned
 * representative rather than its only member — every edge anchored in the
 * tile's first column. {@link MosaicNamingService.name} names it back.
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

  // 🌎 Public Methods

  /**
   * The tile a sub-family is named for at `rows`, or `undefined` where the
   * sub-family names no tile at that row count at all — `diamond` over an
   * interior with an odd number of levels, and any sub-family below one
   * interior level.
   *
   * A region can hold many tiles: `dashes` covers every arrangement of
   * eastward edges, staggered ones included. This returns the aligned
   * representative, every edge anchored in the tile's first column, which
   * is the one the region is named after. `MosaicNamingService.name` names
   * it back.
   */
  tile(
    subFamily: MosaicBuildableSubFamily,
    rows: number,
  ): MosaicTile | undefined {
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
