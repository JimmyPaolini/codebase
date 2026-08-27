import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  Modifier,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
  UnitBorderOptions,
} from "../meander-generation/meander-generation.types";
import type { MotifLevelPoint } from "../motif-transforms/motif-transforms.types";

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
  private basePoints(rows: number): readonly MotifLevelPoint[] {
    const firstArm = this.firstArmPoints(rows);
    const secondArm = this.motifTransformsService
      .rotate(firstArm, this.centerPoint(rows), 2)
      .toReversed();

    return [...firstArm, ...secondArm];
  }

  /** The motif's own bounding-box center that the 180° rotation joining its two arms pivots around. Unrelated to `flip`'s own mirror pivot, which uses {@link pitchLevels} directly instead. */
  private centerPoint(rows: number): MotifLevelPoint {
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
  private firstArmPoints(rows: number): MotifLevelPoint[] {
    const startPoint: MotifLevelPoint = [
      Math.floor((rows - 2) / 2),
      Math.floor(rows / 2),
    ];
    const initialHeadingY = rows % 2 === 0 ? -1 : 1;
    let heading: MotifLevelPoint = [0, initialHeadingY];
    let [currentX, currentY] = startPoint;
    const points: MotifLevelPoint[] = [startPoint];

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
  private flippedPoints(rows: number): readonly MotifLevelPoint[] {
    const points = this.basePoints(rows);
    const mirrorCenter: MotifLevelPoint = [
      this.pitchLevels(rows) - 0.5,
      rows / 2,
    ];

    return this.motifTransformsService.mirror(points, mirrorCenter, "vertical");
  }

  /** How many grid levels the motif's own two-armed spiral spans before the `flip` modifier's mirrored twin is fused on. */
  private pitchLevels(rows: number): number {
    return 2 * rows - 3;
  }

  /** Every point sequence one repeat unit traces: the base spiral, plus `flip`'s mirrored twin fused onto it. */
  private subpaths(
    rows: number,
    modifier?: Modifier,
  ): readonly (readonly MotifLevelPoint[])[] {
    return modifier?.name === "flip"
      ? [this.basePoints(rows), this.flippedPoints(rows)]
      : [this.basePoints(rows)];
  }

  // 🌎 Public Methods

  /**
   * Draws one unit's own top/bottom border segment, spanning just that
   * unit's width. Unlike `snake`/`chain`/`whirl`, `swirl`'s reference
   * geometry draws both the top and bottom segment in the SAME
   * left-to-right direction rather than reversing the bottom one: rows 5,
   * 6, 7, and 8 (and every `flip` reference file) use that same direction,
   * while the 4-rows reference alone reverses its bottom segment — a plain
   * stroked line with `stroke-linecap="square"` renders identically either
   * way, so the majority (and every `flip` file) is what this follows.
   *
   * The last unit's segment stops at
   * {@link MotifTransformsService.rightmostLevel} instead, flush with where
   * its own spiral trace ends. Every other unit keeps the full
   * width so its border stays contiguous with the next unit's; the last
   * unit has no next unit to hand the remainder to, so spanning the full
   * width would trail a bare stub off the end of the pattern.
   */
  borderSegment(geometry: GridGeometry, unit: UnitBorderOptions): string {
    const { isLastUnit, modifier, rows, xOffset } = unit;
    const rightWidth = isLastUnit
      ? this.motifTransformsService.rightmostLevel(
          this.subpaths(rows, modifier),
        ) * geometry.unit
      : this.unitWidth(geometry, rows, modifier);
    const leftX = this.gridGeometryService.formatCoordinate(
      geometry.offset + xOffset,
    );
    const rightX = this.gridGeometryService.formatCoordinate(
      geometry.offset + xOffset + rightWidth,
    );
    const topY = this.gridGeometryService.formatCoordinate(geometry.offset);
    const bottomY = this.gridGeometryService.formatCoordinate(
      geometry.offset + geometry.height,
    );

    return `M${leftX} ${topY}H${rightX}M${leftX} ${bottomY}H${rightX}`;
  }

  /** Draws one repeat unit's spiral (and its mirrored twin when `flip` is set) plus its own border, as an SVG path attribute value. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { isLastUnit, modifier, rows, unitIndex } = unit;
    const xOffset = unitIndex * this.unitWidth(geometry, rows, modifier);
    const toXCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + xOffset + level * geometry.unit,
      );
    const toYCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + level * geometry.unit,
      );
    const pathData = this.subpaths(rows, modifier)
      .map((points) =>
        this.motifTransformsService.pointsToPathData(
          points,
          toXCoordinate,
          toYCoordinate,
        ),
      )
      .join("");

    return (
      pathData +
      this.borderSegment(geometry, {
        isLastUnit,
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
