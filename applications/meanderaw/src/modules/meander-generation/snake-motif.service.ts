import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";
import { SnakeSequenceService } from "./snake-sequence.service";

import type {
  GridGeometry,
  MotifService,
  MotifUnit,
  SpiralLevelPoint,
} from "./meander-generation.types";

/**
 * Draws the `snake` motif: the shared zigzag sequence traced as one
 * continuous path, with each unit drawing its own top/bottom border
 * segment rather than sharing one border path across the whole pattern
 * (unlike `boxes`).
 */
@Injectable()
export class SnakeMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(SnakeSequenceService)
    private readonly snakeSequenceService: SnakeSequenceService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Draws one unit's own top/bottom border segment, spanning just that unit's width. */
  borderSegment(geometry: GridGeometry, xOffset: number, rows: number): string {
    const leftX = this.gridGeometryService.formatCoordinate(
      geometry.offset + xOffset,
    );
    const rightX = this.gridGeometryService.formatCoordinate(
      geometry.offset + xOffset + this.unitWidth(geometry, rows),
    );
    const topY = this.gridGeometryService.formatCoordinate(geometry.offset);
    const bottomY = this.gridGeometryService.formatCoordinate(
      geometry.offset + geometry.height,
    );

    return `M${leftX} ${topY}H${rightX}M${rightX} ${bottomY}H${leftX}`;
  }

  /** Draws one repeat unit's zigzag plus its own border, as an SVG path attribute value. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { rows, unitIndex } = unit;
    const points = this.snakeSequenceService.points(rows);
    const xOffset = unitIndex * this.unitWidth(geometry, rows);
    const toXCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + xOffset + level * geometry.unit,
      );
    const toYCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + level * geometry.unit,
      );

    return (
      this.pointsToPathData(points, toXCoordinate, toYCoordinate) +
      this.borderSegment(geometry, xOffset, rows)
    );
  }

  /** Turns a point sequence into SVG path data, choosing `H`/`V` per segment by which coordinate actually changed. */
  pointsToPathData(
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

  /** The x-coordinate of the last unit's rightmost point, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, rows: number, repeatCount: number): number {
    return geometry.offset + repeatCount * this.unitWidth(geometry, rows);
  }

  /** How far each successive unit is translated horizontally: the zigzag spans every grid level up to `rows - 1`. */
  unitWidth(geometry: GridGeometry, rows: number): number {
    return (rows - 1) * geometry.unit;
  }
}
