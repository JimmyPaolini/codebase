import { Injectable } from "@nestjs/common";

import type { MirrorAxis, MotifLevelPoint } from "./motif-transforms.types";

/**
 * Generic, type-agnostic geometric transforms over a point sequence
 * (grid levels, not pixels). Every method takes the sequence plus a center
 * point to transform around, and returns a new sequence in the same point
 * order — callers convert to pixels and serialize to path data afterward.
 *
 * It held three methods that did not fit that shape — `alternate`,
 * `columnSpans`, and `dotLevels` — each describing disconnected segments
 * rather than one polyline, and each called by `MosaicMotifService` alone.
 * They left with it: the `mosaic` family draws no motif now, so a zigzag
 * split and a dot ladder have no caller and nothing generic was lost.
 * {@link closeEdge} is the one remaining exception, and `chain` and `snake`
 * both call it.
 */
@Injectable()
export class MotifTransformsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Closes a `chain`/`snake` repeat unit's zigzag flush against the
   * pattern's shared top/bottom border: prepends a connector from the
   * bottom border up to the sequence's first point, and extends the
   * sequence's last point up onto the top border. Doesn't fit the plain
   * point-sequence-in/point-sequence-out shape `rotate`/`mirror` share — it
   * inserts a new point rather than only transforming existing ones, and
   * the caller must separately widen the unit's own repeat pitch from
   * `rows - 1` to `rows` grid levels so consecutive units' borders still
   * meet edge to edge.
   */
  closeEdge(
    points: readonly MotifLevelPoint[],
    rows: number,
  ): MotifLevelPoint[] {
    const [firstPointXLevel] = points[0] ?? [0, 0];
    const lastPoint = points.at(-1) ?? [0, 0];
    const [lastPointXLevel] = lastPoint;

    return [
      [firstPointXLevel, rows],
      ...points.slice(0, -1),
      [lastPointXLevel, 0],
    ];
  }

  /**
   * Reflects every point across a line through `center`, keeping point
   * order unchanged. `"horizontal"` reflects over a horizontal line
   * (negates the y distance from center, an up/down flip); `"vertical"`
   * reflects over a vertical line (negates the x distance from center, a
   * left/right flip).
   */
  mirror(
    points: readonly MotifLevelPoint[],
    center: MotifLevelPoint,
    axis: MirrorAxis,
  ): MotifLevelPoint[] {
    const [centerX, centerY] = center;

    return points.map(([x, y]): MotifLevelPoint => {
      if (axis === "horizontal") {
        return [x, 2 * centerY - y];
      }
      return [2 * centerX - x, y];
    });
  }

  /**
   * Rotates every point by `quarterTurns * 90°` counterclockwise around
   * `center`, keeping point order unchanged. `quarterTurns` is normalized
   * modulo 4, so any integer (negative included) is accepted.
   */
  /** Turns a point sequence into SVG path data, choosing `H`/`V` per segment by which coordinate actually changed. */
  pointsToPathData(
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

  /**
   * The rightmost grid level any of `subpaths` reaches. What a motif's
   * border needs to know to end flush with its own trace on the pattern's
   * last repeat unit, where no following unit fills the space between the
   * trace and the unit pitch. Read off the traced points rather than
   * derived from `rows`, so it stays true to whatever the motif's own point
   * sequences actually draw — including a `flip` modifier's mirrored twin,
   * which reaches further right than the sequence it was mirrored from.
   */
  rightmostLevel(subpaths: readonly (readonly MotifLevelPoint[])[]): number {
    const xLevels = subpaths.flatMap((points) =>
      points.map(([xLevel]) => xLevel),
    );

    return Math.max(...xLevels);
  }

  /**
   * Rotates every point by `quarterTurns * 90°` counterclockwise around
   * `center`, keeping point order unchanged. `quarterTurns` is normalized
   * modulo 4, so any integer (negative included) is accepted.
   */
  rotate(
    points: readonly MotifLevelPoint[],
    center: MotifLevelPoint,
    quarterTurns: number,
  ): MotifLevelPoint[] {
    const normalizedTurns = ((quarterTurns % 4) + 4) % 4;

    if (normalizedTurns === 0) {
      return [...points];
    }

    const [centerX, centerY] = center;

    return points.map(([x, y]): MotifLevelPoint => {
      const distanceX = x - centerX;
      const distanceY = y - centerY;

      switch (normalizedTurns) {
        case 1: {
          return [centerX - distanceY, centerY + distanceX];
        }
        case 2: {
          return [centerX - distanceX, centerY - distanceY];
        }
        default: {
          return [centerX + distanceY, centerY - distanceX];
        }
      }
    });
  }
}
