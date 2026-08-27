import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { SPIN_CYCLE_LENGTH } from "../meander-generation/meander-generation.constants";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  Modifier,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "../meander-generation/meander-generation.types";
import type { MotifLevelPoint } from "../motif-transforms/motif-transforms.types";
import type { BoxesSpiralBounds } from "./boxes-motif.types";

/**
 * Draws the `boxes` motif: an inward spiral that traces `rows - 1` grid
 * levels, so both the spiral's depth and each unit's horizontal span grow
 * with `rows` rather than staying fixed.
 */
@Injectable()
export class BoxesMotifService implements MotifService {
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

  /** Computes the next spiral corner, mutating `bounds` to shrink the side it just used. */
  private advanceSpiral(
    bounds: BoxesSpiralBounds,
    moveIndex: number,
  ): MotifLevelPoint {
    switch (moveIndex % 4) {
      case 0: {
        const point: MotifLevelPoint = [bounds.right, bounds.top];
        bounds.top += 1;
        return point;
      }
      case 1: {
        const point: MotifLevelPoint = [bounds.right, bounds.bottom];
        bounds.right -= 1;
        return point;
      }
      case 2: {
        const point: MotifLevelPoint = [bounds.left, bounds.bottom];
        bounds.bottom -= 1;
        return point;
      }
      default: {
        const point: MotifLevelPoint = [bounds.left, bounds.top];
        bounds.left += 1;
        return point;
      }
    }
  }

  /** The spiral's grid-level bounding box center, every rotation and mirror pivots around this. */
  private centerPoint(rows: number): MotifLevelPoint {
    return [(rows - 2) / 2, rows / 2];
  }

  /** Turns a point sequence into SVG path data, choosing `H`/`V` per segment by which coordinate actually changed rather than by index parity — required once a transform can swap which axis a step moves along. */
  private pointsToPathData(
    points: readonly MotifLevelPoint[],
    toXCoordinate: (level: number) => string,
    toYCoordinate: (level: number) => string,
  ): string {
    const { pathData } = points.reduce<{
      pathData: string;
      previousPoint: MotifLevelPoint | undefined;
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

  /** Traces the full inward spiral for one unit, in grid levels. */
  private spiralPoints(rows: number): MotifLevelPoint[] {
    const bounds: BoxesSpiralBounds = {
      bottom: rows - 1,
      left: 0,
      right: rows - 2,
      top: 1,
    };
    const points: MotifLevelPoint[] = [[bounds.left, bounds.top]];
    const totalMoves = 2 * rows - 3;

    for (let moveIndex = 0; moveIndex < totalMoves; moveIndex += 1) {
      points.push(this.advanceSpiral(bounds, moveIndex));
    }

    return points;
  }

  /** Applies the unit's modifier (spin's rotation, spin-flip's rotation plus mirror) to the base spiral points. */
  private unitPoints(
    rows: number,
    unitIndex: number,
    modifier: Modifier | undefined,
  ): readonly MotifLevelPoint[] {
    const points = this.spiralPoints(rows);

    if (
      !modifier ||
      (modifier.name !== "spin" && modifier.name !== "spin-flip")
    ) {
      return points;
    }

    const center = this.centerPoint(rows);
    const quarterTurns = unitIndex % SPIN_CYCLE_LENGTH;
    const rotated = this.motifTransformsService.rotate(
      points,
      center,
      quarterTurns,
    );
    const pointsByModifierName: Record<
      "spin" | "spin-flip",
      () => readonly MotifLevelPoint[]
    > = {
      spin: () => rotated,
      "spin-flip": () =>
        this.motifTransformsService.mirror(rotated, center, "horizontal"),
    };

    return pointsByModifierName[modifier.name]();
  }

  // 🌎 Public Methods

  /** Draws the top/bottom border shared by every unit, spanning the full pattern width. */
  border(geometry: GridGeometry, pattern: RepeatPatternOptions): string {
    const leftX = this.gridGeometryService.formatCoordinate(geometry.offset);
    const rightX = this.gridGeometryService.formatCoordinate(
      this.rightEdge(geometry, pattern),
    );
    const topY = this.gridGeometryService.formatCoordinate(geometry.offset);
    const bottomY = this.gridGeometryService.formatCoordinate(
      geometry.offset + geometry.height,
    );

    return `M${rightX} ${bottomY}H${leftX}M${rightX} ${topY}H${leftX}`;
  }

  /** Draws one repeat unit's spiral as an SVG path attribute value, applying the unit's modifier (if any) first. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { modifier, rows, unitIndex } = unit;
    const points = this.unitPoints(rows, unitIndex, modifier);
    const xOffset = unitIndex * this.unitWidth(geometry, rows);
    const toXCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + xOffset + level * geometry.unit,
      );
    const toYCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + level * geometry.unit,
      );

    return this.pointsToPathData(points, toXCoordinate, toYCoordinate);
  }

  /** The x-coordinate of the last unit's rightmost point, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    return (
      geometry.offset +
      (pattern.repeatCount - 1) * this.unitWidth(geometry, pattern.rows) +
      (pattern.rows - 2) * geometry.unit
    );
  }

  /** How far each successive unit is translated horizontally. */
  unitWidth(geometry: GridGeometry, rows: number): number {
    return (rows - 1) * geometry.unit;
  }
}
