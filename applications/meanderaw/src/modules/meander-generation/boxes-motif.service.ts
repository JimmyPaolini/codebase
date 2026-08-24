import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";

import type {
  BoxesSpiralBounds,
  GridGeometry,
  SpiralLevelPoint,
} from "./meander-generation.types";

/**
 * Draws the `boxes` motif: an inward spiral that traces `rows - 1` grid
 * levels, so both the spiral's depth and each unit's horizontal span grow
 * with `rows` rather than staying fixed.
 */
@Injectable()
export class BoxesMotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Computes the next spiral corner, mutating `bounds` to shrink the side it just used. */
  private advanceSpiral(
    bounds: BoxesSpiralBounds,
    moveIndex: number,
  ): SpiralLevelPoint {
    switch (moveIndex % 4) {
      case 0: {
        const point: SpiralLevelPoint = [bounds.right, bounds.top];
        bounds.top += 1;
        return point;
      }
      case 1: {
        const point: SpiralLevelPoint = [bounds.right, bounds.bottom];
        bounds.right -= 1;
        return point;
      }
      case 2: {
        const point: SpiralLevelPoint = [bounds.left, bounds.bottom];
        bounds.bottom -= 1;
        return point;
      }
      default: {
        const point: SpiralLevelPoint = [bounds.left, bounds.top];
        bounds.left += 1;
        return point;
      }
    }
  }

  /** Traces the full inward spiral for one unit, in grid levels. */
  private spiralPoints(rows: number): SpiralLevelPoint[] {
    const bounds: BoxesSpiralBounds = {
      bottom: rows - 1,
      left: 0,
      right: rows - 2,
      top: 1,
    };
    const points: SpiralLevelPoint[] = [[bounds.left, bounds.top]];
    const totalMoves = 2 * rows - 3;

    for (let moveIndex = 0; moveIndex < totalMoves; moveIndex += 1) {
      points.push(this.advanceSpiral(bounds, moveIndex));
    }

    return points;
  }

  // 🌎 Public Methods

  /** Draws the top/bottom border shared by every unit, spanning the full pattern width. */
  border(geometry: GridGeometry, rows: number, repeatCount: number): string {
    const leftX = this.gridGeometryService.formatCoordinate(geometry.offset);
    const rightX = this.gridGeometryService.formatCoordinate(
      this.rightEdge(geometry, rows, repeatCount),
    );
    const topY = this.gridGeometryService.formatCoordinate(geometry.offset);
    const bottomY = this.gridGeometryService.formatCoordinate(
      geometry.offset + geometry.height,
    );

    return `M${rightX} ${bottomY}H${leftX}M${rightX} ${topY}H${leftX}`;
  }

  /** Draws one repeat unit's spiral as an SVG path attribute value. */
  path(geometry: GridGeometry, rows: number, unitIndex: number): string {
    const points = this.spiralPoints(rows);
    const xOffset = unitIndex * this.unitWidth(geometry, rows);
    const toXCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + xOffset + level * geometry.unit,
      );
    const toYCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + level * geometry.unit,
      );

    return points
      .map(([xLevel, yLevel], index) => {
        if (index === 0) {
          return `M${toXCoordinate(xLevel)} ${toYCoordinate(yLevel)}`;
        }
        return index % 2 === 1
          ? `H${toXCoordinate(xLevel)}`
          : `V${toYCoordinate(yLevel)}`;
      })
      .join("");
  }

  /** The x-coordinate of the last unit's rightmost point, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, rows: number, repeatCount: number): number {
    return (
      geometry.offset +
      (repeatCount - 1) * this.unitWidth(geometry, rows) +
      (rows - 2) * geometry.unit
    );
  }

  /** How far each successive unit is translated horizontally. */
  unitWidth(geometry: GridGeometry, rows: number): number {
    return (rows - 1) * geometry.unit;
  }
}
