import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  MeanderPointDirections,
  MeanderPointGrid,
} from "../meander-decoding/meander-decoding.types";
import type { MeanderCanvasPoint } from "./meander-rendering.types";

/**
 * Draws a decoded Code's point grid to SVG: the family-agnostic mechanical
 * rule generalized from `MosaicTileMotifService.path`, so it applies to
 * every family's Code rather than only `mosaic`'s tiles.
 *
 * Each point owns two of its four direction bits — an `east` bit draws one
 * unit right, a `south` bit one unit down — and a point owning neither is an
 * inked dot: a zero-length stroke whose square cap paints the lattice point
 * and nothing else, which is what makes the drawing space-filling with no
 * predicate to check. `north` and `west` are read only to decide whether a
 * point is bare; they draw nothing of their own, since the neighbor that
 * owns the matching `south`/`east` bit already draws that segment.
 *
 * Unlike `MosaicTileMotifService`, this renderer draws no repeat unit, no
 * leading overhang, and no per-unit cap-tick clipping. A Code named by
 * `--rows`/`--columns`/`--code` is one whole meander already, not one tile
 * meant to be tiled several times, so there is no second repeat for an
 * overhang to reach into or a cap tick to stay flush with — the top and
 * bottom border rules run the grid's own full width exactly once, drawn by
 * the already-generic `GridGeometryService.borderPath` rather than a rule
 * reimplemented here.
 */
@Injectable()
export class MeanderRenderingService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(SvgRenderingService)
    private readonly svgRenderingService: SvgRenderingService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Rounds and trims one pixel coordinate for interpolation into path data. */
  private format(value: number): string {
    return this.gridGeometryService.formatCoordinate(value);
  }

  /** The path data every point of the grid draws, in reading order. */
  private gridSegments(geometry: GridGeometry, grid: MeanderPointGrid): string {
    return grid
      .flatMap((row, level) =>
        row.map((point, column) =>
          this.pointSegments(geometry, point, {
            x: geometry.offset + column * geometry.unit,
            y: geometry.offset + (level + 1) * geometry.unit,
          }),
        ),
      )
      .join("");
  }

  /** Whether a point carries no direction bit at all, own or neighbor's. */
  private isBare(point: MeanderPointDirections): boolean {
    return !point.east && !point.north && !point.south && !point.west;
  }

  /** The path data one point draws: the edges it owns, or a dot where it owns none. */
  private pointSegments(
    geometry: GridGeometry,
    point: MeanderPointDirections,
    origin: MeanderCanvasPoint,
  ): string {
    const startX = this.format(origin.x);
    const startY = this.format(origin.y);

    if (this.isBare(point)) {
      return `M${startX} ${startY}H${startX}`;
    }

    const east = point.east
      ? `M${startX} ${startY}H${this.format(origin.x + geometry.unit)}`
      : "";
    const south = point.south
      ? `M${startX} ${startY}V${this.format(origin.y + geometry.unit)}`
      : "";

    return `${east}${south}`;
  }

  // 🌎 Public Methods

  /**
   * Renders a decoded grid to a complete SVG document: `rows` grid units
   * tall — the same fixed canvas height every family draws against — and
   * `columns` grid units wide, with no repeat and no addressed window,
   * since a Code names one whole meander directly.
   */
  render(grid: MeanderPointGrid, rows: number, columns: number): string {
    const geometry = this.gridGeometryService.compute(rows);
    const rightEdge = geometry.offset + columns * geometry.unit;
    const paths = [
      this.gridSegments(geometry, grid),
      this.gridGeometryService.borderPath(geometry, rightEdge),
    ];

    return this.svgRenderingService.render({
      height: this.format(
        geometry.offset + geometry.height + geometry.strokeWidth / 2,
      ),
      paths,
      strokeWidth: this.format(geometry.strokeWidth),
      width: this.format(rightEdge + geometry.strokeWidth / 2),
    });
  }
}
