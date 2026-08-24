import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";

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
    @Inject(MotifTransformsService)
    private readonly motifTransformsService: MotifTransformsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Draws the `alternated` modifier's zigzag: `unitIndex` now advances two
   * real columns at a time (its "own" column and its neighbor), since one
   * zigzag repeat needs both to alternate between. Verified against `5`,
   * `7`, and `8 rows bars alternated.svg` — see
   * {@link MotifTransformsService.alternate} for the full derivation,
   * including why larger periods deliberately don't match `alternated 2`/
   * `alternated 3`'s reference geometry bit-for-bit.
   */
  private alternatedPath(
    geometry: GridGeometry,
    unit: MotifUnit,
    period: number,
  ): string {
    const { rows, unitIndex } = unit;
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);
    const ownColumnX = geometry.offset + unitIndex * 2 * geometry.unit;
    const neighborColumnX = ownColumnX + geometry.unit;
    const runs = this.motifTransformsService.alternate(1, rows - 1, period);

    const runSegments = runs
      .map((run) => {
        const columnX = run.column === 0 ? ownColumnX : neighborColumnX;
        const fromY = geometry.offset + run.fromLevel * geometry.unit;
        const toY = geometry.offset + run.toLevel * geometry.unit;

        return `M${format(columnX)} ${format(fromY)}V${format(toY)}`;
      })
      .join("");

    const formattedOwnColumnX = format(ownColumnX);
    const capRightX = format(ownColumnX + 2 * geometry.unit);
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `${runSegments}M${formattedOwnColumnX} ${capTopY}H${capRightX}M${formattedOwnColumnX} ${capBottomY}H${capRightX}`;
  }

  // 🌎 Public Methods

  /** Draws one repeat unit's bar and its two caps, as an SVG path attribute value. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { modifier, rows, unitIndex } = unit;
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);

    if (modifier?.name === "alternated") {
      return this.alternatedPath(geometry, unit, modifier.period);
    }

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
   *
   * `alternated` doubles the columns each repeat unit spans, so its last
   * touched column is `2 * repeatCount - 1` rather than `repeatCount - 1` —
   * verified against `5` and `8 rows bars alternated.svg`'s declared canvas
   * width.
   */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    if (pattern.modifier?.name === "alternated") {
      return geometry.offset + (2 * pattern.repeatCount - 1) * geometry.unit;
    }

    return geometry.offset + (pattern.repeatCount - 1) * geometry.unit;
  }
}
