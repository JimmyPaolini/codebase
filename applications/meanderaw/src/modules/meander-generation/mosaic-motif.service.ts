import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";

import type {
  GridGeometry,
  MosaicPiece,
  MosaicTile,
} from "./meander-generation.types";

/**
 * Draws one repeat unit of a `mosaic` tile: every mark the tile anchors,
 * plus the two cap ticks spanning the tile's own column span at grid levels
 * `0` and `rows`. Every mark is at most one grid unit long, so unlike
 * `bars` no run can outgrow the single segment the family is built from.
 */
@Injectable()
export class MosaicMotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Rounds and trims one pixel coordinate for interpolation into path data. */
  private format(value: number): string {
    return this.gridGeometryService.formatCoordinate(value);
  }

  /** The path data for one mark, anchored at its own cell's pixel position. */
  private markSegment(
    geometry: GridGeometry,
    piece: MosaicPiece,
    tileStartColumn: number,
  ): string {
    const x =
      geometry.offset + (tileStartColumn + piece.column) * geometry.unit;
    const y = geometry.offset + (piece.level + 1) * geometry.unit;
    const startX = this.format(x);
    const startY = this.format(y);

    if (piece.kind === "vertical") {
      return `M${startX} ${startY}V${this.format(y + geometry.unit)}`;
    }

    if (piece.kind === "dot") {
      return `M${startX} ${startY}H${startX}`;
    }

    return `M${startX} ${startY}H${this.format(x + geometry.unit)}`;
  }

  // 🌎 Public Methods

  /**
   * Draws the marks that reach into the pattern's very first column from
   * the repeat unit that would have preceded it. A horizontal dash anchored
   * on the tile's last column spans into the next tile, so every column it
   * covers is drawn by the tile to its left — except the first one in the
   * pattern, which has no such neighbor and would be left with an uncovered
   * cell. Drawing that one unit's worth of overhang closes the hole; the
   * canvas crops everything of it that falls left of the origin.
   *
   * Returns an empty string for a tile with no wrapping dash, which is why
   * a mosaic that doesn't need this is byte-identical without it.
   */
  leadingOverhang(geometry: GridGeometry, tile: MosaicTile): string {
    return tile.pieces
      .filter(
        (piece) =>
          piece.kind === "horizontal" && piece.column === tile.columns - 1,
      )
      .map((piece) => this.markSegment(geometry, piece, -tile.columns))
      .join("");
  }

  /** Draws one repeat unit's marks and its two cap ticks, as an SVG path attribute value. */
  path(geometry: GridGeometry, tile: MosaicTile, unitIndex: number): string {
    const tileStartColumn = unitIndex * tile.columns;
    const markSegments = tile.pieces
      .map((piece) => this.markSegment(geometry, piece, tileStartColumn))
      .join("");

    const tileStartX = this.format(
      geometry.offset + tileStartColumn * geometry.unit,
    );
    const capRightX = this.format(
      geometry.offset + (tileStartColumn + tile.columns) * geometry.unit,
    );
    const capTopY = this.format(geometry.offset);
    const capBottomY = this.format(geometry.offset + tile.rows * geometry.unit);

    return `${markSegments}M${tileStartX} ${capTopY}H${capRightX}M${tileStartX} ${capBottomY}H${capRightX}`;
  }

  /**
   * How far right the drawn marks reach, before the stroke-width margin —
   * the cap ticks' own one-unit overshoot past the last column is cropped
   * off the canvas, the same way {@link BarsMotifService.rightEdge} crops
   * it. A tile whose last column anchors a horizontal dash reaches a full
   * unit further than one that ends in dots, which is exactly why `lines`
   * declares a wider canvas than `dots` at the same repeat count.
   */
  rightEdge(
    geometry: GridGeometry,
    tile: MosaicTile,
    repeatCount: number,
  ): number {
    const lastTileStartColumn = (repeatCount - 1) * tile.columns;
    const reaches = tile.pieces.map((piece) => {
      const column = lastTileStartColumn + piece.column;
      const spansRight = piece.kind === "horizontal" || piece.kind === "line";

      return geometry.offset + (column + (spansRight ? 1 : 0)) * geometry.unit;
    });

    return Math.max(...reaches);
  }
}
