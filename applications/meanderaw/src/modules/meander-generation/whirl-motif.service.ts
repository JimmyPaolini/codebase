import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";

import type {
  GridGeometry,
  Modifier,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
  SpiralLevelPoint,
  UnitBorderOptions,
} from "./meander-generation.types";

/**
 * Draws the `whirl` motif: a single inward spiral arm that turns a quarter
 * turn counterclockwise after every step with a shrinking step length
 * (`rows - 2` traced twice, then `rows - 3`, `rows - 4`, ... down to `1`
 * once each), joined to its own 180° rotation to form the full shape.
 * Verified against `4/5/6/7/8 rows whirl.svg`: unlike `swirl`, the arm's
 * starting point `(0, rows - 1)` and initial heading never depend on
 * `rows`'s parity.
 */
@Injectable()
export class WhirlMotifService implements MotifService {
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

  /** Traces the spiral's single arm: starting at `(0, rows - 1)` heading up, stepping by each length from `rows - 2` (twice) down to `1` (once), turning a quarter turn counterclockwise after every step. */
  private armPoints(rows: number): SpiralLevelPoint[] {
    const lengths = [
      rows - 2,
      ...Array.from({ length: rows - 2 }, (_value, index) => rows - 2 - index),
    ];
    let heading: SpiralLevelPoint = [0, -1];
    let currentX = 0;
    let currentY = rows - 1;
    const points: SpiralLevelPoint[] = [[currentX, currentY]];

    for (const length of lengths) {
      const [headingX, headingY] = heading;
      currentX += headingX * length;
      currentY += headingY * length;
      points.push([currentX, currentY]);
      heading = [-headingY, headingX];
    }

    return points;
  }

  /** Traces the full spiral: one arm, then its 180° rotation about the motif's own center, reversed so the two halves read as one continuous shape. */
  private basePoints(rows: number): readonly SpiralLevelPoint[] {
    const arm = this.armPoints(rows);
    const rotatedArm = this.motifTransformsService
      .rotate(arm, this.centerPoint(rows), 2)
      .toReversed();

    return [...arm, ...rotatedArm];
  }

  /** The motif's own bounding-box center, both the 180° rotation joining its arm to itself and (indirectly, via {@link pitchLevels}) the `flip` modifier's mirror pivot. */
  private centerPoint(rows: number): SpiralLevelPoint {
    return [(rows - 1) / 2, rows / 2];
  }

  /** Mirrors the base spiral across the motif's own right edge, fusing a mirrored twin onto the un-flipped motif for the `flip` modifier. */
  private flippedPoints(rows: number): readonly SpiralLevelPoint[] {
    const points = this.basePoints(rows);
    const mirrorCenter: SpiralLevelPoint = [
      this.pitchLevels(rows) - 0.5,
      rows / 2,
    ];

    return this.motifTransformsService.mirror(points, mirrorCenter, "vertical");
  }

  /** How many grid levels the motif's own single-arm spiral spans before the `flip` modifier's mirrored twin is fused on. */
  private pitchLevels(rows: number): number {
    return rows;
  }

  /** Turns a point sequence into SVG path data, choosing `H`/`V` per segment by which coordinate actually changed. */
  private pointsToPathData(
    points: readonly SpiralLevelPoint[],
    toXCoordinate: (level: number) => string,
    toYCoordinate: (level: number) => string,
  ): string {
    const { pathData } = points.reduce<{
      pathData: string;
      previousPoint: SpiralLevelPoint | undefined;
    }>(
      (accumulator, point) => {
        const [xLevel, yLevel] = point;

        if (!accumulator.previousPoint) {
          return {
            pathData: `M${toXCoordinate(xLevel)} ${toYCoordinate(yLevel)}`,
            previousPoint: point,
          };
        }

        const [previousXLevel] = accumulator.previousPoint;
        const segment =
          xLevel === previousXLevel
            ? `V${toYCoordinate(yLevel)}`
            : `H${toXCoordinate(xLevel)}`;

        return {
          pathData: accumulator.pathData + segment,
          previousPoint: point,
        };
      },
      { pathData: "", previousPoint: undefined },
    );

    return pathData;
  }

  // 🌎 Public Methods

  /** Draws one unit's own top/bottom border segment, spanning just that unit's width. */
  borderSegment(geometry: GridGeometry, unit: UnitBorderOptions): string {
    const { modifier, rows, xOffset } = unit;
    const leftX = this.gridGeometryService.formatCoordinate(
      geometry.offset + xOffset,
    );
    const rightX = this.gridGeometryService.formatCoordinate(
      geometry.offset + xOffset + this.unitWidth(geometry, rows, modifier),
    );
    const topY = this.gridGeometryService.formatCoordinate(geometry.offset);
    const bottomY = this.gridGeometryService.formatCoordinate(
      geometry.offset + geometry.height,
    );

    return `M${leftX} ${topY}H${rightX}M${rightX} ${bottomY}H${leftX}`;
  }

  /** Draws one repeat unit's spiral (and its mirrored twin when `flip` is set) plus its own border, as an SVG path attribute value. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { modifier, rows, unitIndex } = unit;
    const xOffset = unitIndex * this.unitWidth(geometry, rows, modifier);
    const toXCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + xOffset + level * geometry.unit,
      );
    const toYCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + level * geometry.unit,
      );
    const subpaths =
      modifier?.name === "flip"
        ? [this.basePoints(rows), this.flippedPoints(rows)]
        : [this.basePoints(rows)];
    const pathData = subpaths
      .map((points) =>
        this.pointsToPathData(points, toXCoordinate, toYCoordinate),
      )
      .join("");

    return (
      pathData +
      this.borderSegment(geometry, {
        rows,
        xOffset,
        ...(modifier ? { modifier } : {}),
      })
    );
  }

  /** The x-coordinate of the last unit's rightmost point, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    const { modifier, repeatCount, rows } = pattern;

    return (
      geometry.offset + repeatCount * this.unitWidth(geometry, rows, modifier)
    );
  }

  /** How far each successive unit is translated horizontally: doubled by the `flip` modifier's fused mirrored twin. */
  unitWidth(geometry: GridGeometry, rows: number, modifier?: Modifier): number {
    const levels =
      modifier?.name === "flip"
        ? 2 * this.pitchLevels(rows)
        : this.pitchLevels(rows);

    return levels * geometry.unit;
  }
}
