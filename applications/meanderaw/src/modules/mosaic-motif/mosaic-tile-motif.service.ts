import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import { MosaicTileService } from "./mosaic-tile.service";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  MosaicDirections,
  MosaicLatticePoint,
  MosaicTile,
  MosaicTileUnit,
} from "./mosaic-motif.types";

/**
 * Draws one repeat unit of a `mosaic` tile: every edge the tile's points
 * carry, plus the two cap ticks spanning the tile's own column span at grid
 * levels `0` and `rows`.
 *
 * Drawing is one rule with no cases in it. Each point owns two of its four
 * direction bits — an `east` bit draws one unit right, a `south` bit one
 * unit down — and the other two are drawn by the neighbors that own them.
 * A point owning neither, and reached by neither, is an inked dot: a
 * zero-length stroke whose square cap paints the lattice point and nothing
 * else. That is what makes every tile space-filling with no predicate to
 * check, at any degree.
 */
@Injectable()
export class MosaicTileMotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Rounds and trims one pixel coordinate for interpolation into path data. */
  private format(value: number): string {
    return this.gridGeometryService.formatCoordinate(value);
  }

  /** The path data one point draws: the edges it owns, or a dot where it owns none and is reached by none. */
  private pointSegments(
    geometry: GridGeometry,
    directions: MosaicDirections,
    origin: MosaicLatticePoint,
  ): string {
    const startX = this.format(origin.x);
    const startY = this.format(origin.y);

    if (this.mosaicTileService.isBare(directions)) {
      return `M${startX} ${startY}H${startX}`;
    }

    const east = directions.east
      ? `M${startX} ${startY}H${this.format(origin.x + geometry.unit)}`
      : "";
    const south = directions.south
      ? `M${startX} ${startY}V${this.format(origin.y + geometry.unit)}`
      : "";

    return `${east}${south}`;
  }

  /** The path data every point of one repeat unit draws, in reading order. */
  private unitSegments(
    geometry: GridGeometry,
    tile: MosaicTile,
    tileStartColumn: number,
  ): string {
    return tile.points
      .flatMap((row, level) =>
        row.map((directions, column) =>
          this.pointSegments(geometry, directions, {
            x: geometry.offset + (tileStartColumn + column) * geometry.unit,
            y: geometry.offset + (level + 1) * geometry.unit,
          }),
        ),
      )
      .join("");
  }

  // 🌎 Public Methods

  /**
   * Draws the ink that reaches into the pattern's very first column from
   * the repeat unit that would have preceded it.
   *
   * An `east` bit on the tile's last column is the point's own, and it is
   * drawn where that point sits — so the point it *reaches*, the first
   * column of the next repeat, is painted by the unit to its left. The
   * pattern's own first column has no unit to its left, and would be left
   * unpainted. Drawing that one unit's worth of overhang closes the hole;
   * the canvas crops everything of it that falls left of the origin.
   *
   * At a single column there is nothing to close: the wrapped edge's own
   * point *is* the first column, so its own unit already paints it. Returns
   * an empty string there, and for any tile whose last column carries no
   * `east` bit.
   */
  leadingOverhang(geometry: GridGeometry, tile: MosaicTile): string {
    if (tile.columns === 1) {
      return "";
    }

    const x = geometry.offset - geometry.unit;

    return tile.points
      .flatMap((row, level) =>
        row.flatMap((point, column) =>
          point.east && column === tile.columns - 1
            ? `M${this.format(x)} ${this.format(
                geometry.offset + (level + 1) * geometry.unit,
              )}H${this.format(geometry.offset)}`
            : [],
        ),
      )
      .join("");
  }

  /**
   * Draws one repeat unit's ink and its two cap ticks, as an SVG path
   * attribute value.
   *
   * The last unit's cap ticks stop at {@link rightEdge} — the rightmost
   * point that unit's own ink reaches — rather than at its tile's column
   * span. Every other unit's ticks span the full tile so they stay
   * contiguous with the next tile's own; the last unit has no next tile to
   * hand the remainder to, so a full-span tick there would trail a bare stub
   * past the canvas edge {@link rightEdge} declares.
   */
  path(geometry: GridGeometry, tile: MosaicTile, unit: MosaicTileUnit): string {
    const { isLastUnit, unitIndex } = unit;
    const tileStartColumn = unitIndex * tile.columns;
    const markSegments = this.unitSegments(geometry, tile, tileStartColumn);

    const tileStartX = this.format(
      geometry.offset + tileStartColumn * geometry.unit,
    );
    const capRightX = this.format(
      isLastUnit
        ? this.rightEdge(geometry, tile, unitIndex + 1)
        : geometry.offset + (tileStartColumn + tile.columns) * geometry.unit,
    );
    const capTopY = this.format(geometry.offset);
    const capBottomY = this.format(geometry.offset + tile.rows * geometry.unit);

    return `${markSegments}M${tileStartX} ${capTopY}H${capRightX}M${tileStartX} ${capBottomY}H${capRightX}`;
  }

  /**
   * How far right the drawn ink reaches, before the stroke-width margin.
   * {@link path} clips the last unit's cap ticks to exactly this, so nothing
   * is drawn past it. A tile whose last column carries an `east` bit reaches
   * a full unit further than one whose points all end where they sit, which
   * is exactly why `lines` declares a wider canvas than `dots` at the same
   * repeat count.
   */
  rightEdge(
    geometry: GridGeometry,
    tile: MosaicTile,
    repeatCount: number,
  ): number {
    const lastTileStartColumn = (repeatCount - 1) * tile.columns;
    const reaches = tile.points.flatMap((row) =>
      row.map(
        (directions, column) =>
          geometry.offset +
          (lastTileStartColumn + column + (directions.east ? 1 : 0)) *
            geometry.unit,
      ),
    );

    return Math.max(...reaches);
  }
}
