import { MosaicTileService } from "../src/modules/mosaic-motif/mosaic-tile.service";

import type { MosaicTile } from "../src/modules/mosaic-motif/mosaic-motif.types";

/**
 * Builds `mosaic` tiles for the tests that need one written out by hand.
 *
 * A tile is four direction bits per point, but only two of them are the
 * point's own — the eastward edge leaving it and the southward one — and the
 * other two belong to its neighbors. So a tile is written here as the edges
 * its points *own*, which is both the shortest complete description of one
 * and the only one that cannot be self-contradictory: there is no way to
 * write a pair of neighbors that disagree.
 */

// 🔧 Configuration

/** The real builder, so a hand-written tile is derived exactly as an enumerated one is rather than by a second implementation of the same rule. */
const mosaicTileService = new MosaicTileService();

// 🌎 Utilities

/**
 * The tile whose points own the edges `levels` describes: one string per
 * interior level, one character per column, `.` for a point owning neither
 * edge, `e` for the eastward one, `s` for the southward one, and `b` for
 * both.
 *
 * `rows` is one more than the number of levels, since the cap ticks at grid
 * levels `0` and `rows` are not tile points. A `s` on the last level and a
 * `e` at one column both mean what they always mean — the former is dropped
 * for having nowhere to reach, the latter wraps onto its own point.
 */
export const mosaicTile = (levels: readonly string[]): MosaicTile => {
  const columns = levels[0]?.length ?? 0;
  const rows = levels.length + 1;
  const owns = (level: number, column: number, mark: string): boolean => {
    const character = levels[level]?.[column];

    return character === mark || character === "b";
  };

  return mosaicTileService.build(
    { columns, rows },
    {
      horizontal: Array.from({ length: levels.length }, (_level, level) =>
        Array.from({ length: columns }, (_column, column) =>
          owns(level, column, "e"),
        ),
      ),
      vertical: Array.from({ length: levels.length - 1 }, (_level, level) =>
        Array.from({ length: columns }, (_column, column) =>
          owns(level, column, "s"),
        ),
      ),
    },
  );
};
