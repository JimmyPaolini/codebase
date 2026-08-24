import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";

import type {
  GridGeometry,
  MotifService,
  MotifUnit,
} from "./meander-generation.types";

/**
 * Draws the `chain` motif: the exact same zigzag sequence `snake` draws,
 * split into two disconnected subpaths by omitting the single segment that
 * connects the sequence's two halves at its center. Delegates the shared
 * geometry (border segment, horizontal spacing, right edge) to
 * {@link SnakeMotifService} rather than recomputing it.
 */
@Injectable()
export class ChainMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(SnakeMotifService)
    private readonly snakeMotifService: SnakeMotifService,
    @Inject(SnakeSequenceService)
    private readonly snakeSequenceService: SnakeSequenceService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Draws one repeat unit's two subpaths plus its own border, as an SVG path attribute value. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { rows, unitIndex } = unit;
    const points = this.snakeSequenceService.points(rows);
    const splitIndex = rows - 1;
    const firstSubpath = points.slice(0, splitIndex);
    const secondSubpath = points.slice(splitIndex);
    const xOffset =
      unitIndex * this.snakeMotifService.unitWidth(geometry, rows);
    const toXCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + xOffset + level * geometry.unit,
      );
    const toYCoordinate = (level: number): string =>
      this.gridGeometryService.formatCoordinate(
        geometry.offset + level * geometry.unit,
      );

    return (
      this.snakeMotifService.pointsToPathData(
        firstSubpath,
        toXCoordinate,
        toYCoordinate,
      ) +
      this.snakeMotifService.pointsToPathData(
        secondSubpath,
        toXCoordinate,
        toYCoordinate,
      ) +
      this.snakeMotifService.borderSegment(geometry, xOffset, rows)
    );
  }

  /** Delegates to {@link SnakeMotifService}: `chain` shares `snake`'s grid exactly. */
  rightEdge(geometry: GridGeometry, rows: number, repeatCount: number): number {
    return this.snakeMotifService.rightEdge(geometry, rows, repeatCount);
  }
}
