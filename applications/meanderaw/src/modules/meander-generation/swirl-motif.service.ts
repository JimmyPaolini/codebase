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
 * Draws the `swirl` motif: two nested inward spiral arms, each turning a
 * quarter turn clockwise after every step with a paired step length (every
 * length from 1 up to `rows - 2` is traced twice, first vertically then
 * horizontally, before growing), joined back-to-back by 180° rotational
 * symmetry rather than by a shared edge. Verified against the `4`, `5`, `6`,
 * `7`, and `8` rows `swirl.svg` reference files: the first arm's starting
 * point and initial turn direction flip with `rows`'s parity — `rows - 2` is
 * the same either way, but which way the very first step points is not, so
 * {@link firstArmPoints} branches on it.
 */
@Injectable()
export class SwirlMotifService implements MotifService {
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

  /** Traces the full two-armed spiral: the first arm, then its 180° rotation about the motif's own center, reversed so the two arms read as one continuous shape. */
  private basePoints(rows: number): readonly SpiralLevelPoint[] {
    const firstArm = this.firstArmPoints(rows);
    const secondArm = this.motifTransformsService
      .rotate(firstArm, this.centerPoint(rows), 2)
      .toReversed();

    return [...firstArm, ...secondArm];
  }

  /** The motif's own bounding-box center, both the 180° rotation joining its two arms and the `flip` modifier's mirror pivot around this (indirectly, via {@link pitchLevels}). */
  private centerPoint(rows: number): SpiralLevelPoint {
    return [rows - 2, rows / 2];
  }

  /**
   * Traces one spiral arm: starting at `(⌊(rows - 2) / 2⌋, ⌊rows / 2⌋)`,
   * stepping vertically then horizontally by each length from 1 up to
   * `rows - 2` (each length used twice, once per direction), turning a
   * quarter turn clockwise after every step. Which way the very first step
   * points depends on `rows`'s parity: down (`+1`) for odd `rows`, up
   * (`-1`) for even `rows`.
   */
  private firstArmPoints(rows: number): SpiralLevelPoint[] {
    const startPoint: SpiralLevelPoint = [
      Math.floor((rows - 2) / 2),
      Math.floor(rows / 2),
    ];
    const initialHeadingY = rows % 2 === 0 ? -1 : 1;
    let heading: SpiralLevelPoint = [0, initialHeadingY];
    let [currentX, currentY] = startPoint;
    const points: SpiralLevelPoint[] = [startPoint];

    for (let length = 1; length <= rows - 2; length += 1) {
      for (let step = 0; step < 2; step += 1) {
        const [headingX, headingY] = heading;
        currentX += headingX * length;
        currentY += headingY * length;
        points.push([currentX, currentY]);
        heading = [headingY, -headingX];
      }
    }

    return points;
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

  /** How many grid levels the motif's own two-armed spiral spans before the `flip` modifier's mirrored twin is fused on. */
  private pitchLevels(rows: number): number {
    return 2 * rows - 3;
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

  /**
   * Draws one unit's own top/bottom border segment, spanning just that
   * unit's width. Unlike `snake`/`chain`/`whirl`, `swirl`'s reference
   * geometry draws both the top and bottom segment in the SAME
   * left-to-right direction rather than reversing the bottom one.
   */
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

    return `M${leftX} ${topY}H${rightX}M${leftX} ${bottomY}H${rightX}`;
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
