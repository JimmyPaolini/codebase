import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";

import type {
  GridGeometry,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "./meander-generation.types";

/**
 * Draws the `bars` motif: a vertical bar spanning grid levels 1 through
 * `rows - 1`, capped by a short horizontal tick one grid unit wide at the
 * very top (level 0) and very bottom (level `rows`) of each column. Unlike
 * the spiral types, each unit is three disconnected segments rather than
 * one continuous polyline, so it builds its own path data instead of
 * reusing a shared points-to-path helper.
 */
@Injectable()
export class BarsMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Draws one repeat unit's bar and its two caps, as an SVG path attribute value. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { rows, unitIndex } = unit;
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);

    const columnX = format(geometry.offset + unitIndex * geometry.unit);
    const capRightX = format(
      geometry.offset + unitIndex * geometry.unit + geometry.unit,
    );
    const barTopY = format(geometry.offset + geometry.unit);
    const barBottomY = format(geometry.offset + (rows - 1) * geometry.unit);
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `M${columnX} ${barTopY}V${barBottomY}M${columnX} ${capTopY}H${capRightX}M${columnX} ${capBottomY}H${capRightX}`;
  }

  /**
   * The x-coordinate of the last unit's own column, before the
   * stroke-width margin — deliberately NOT the last unit's cap tick, which
   * overshoots one full grid unit further right. Verified against `5`, `6`,
   * and `8 rows bars.svg`: each reference file's declared canvas width
   * stops exactly at this column plus `offset`, cropping the final cap's
   * overshoot (which would otherwise reach into where a thirteenth,
   * nonexistent unit's column would start) off the visible canvas.
   */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    return geometry.offset + (pattern.repeatCount - 1) * geometry.unit;
  }
}
