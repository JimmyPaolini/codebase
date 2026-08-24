import { Injectable } from "@nestjs/common";

import type { MirrorAxis, SpiralLevelPoint } from "./meander-generation.types";

/**
 * Generic, type-agnostic geometric transforms over a point sequence
 * (grid levels, not pixels). Every method takes the sequence plus a center
 * point to transform around, and returns a new sequence in the same point
 * order — callers convert to pixels and serialize to path data afterward.
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
   * Reflects every point across a line through `center`, keeping point
   * order unchanged. `"horizontal"` reflects over a horizontal line
   * (negates the y distance from center, an up/down flip); `"vertical"`
   * reflects over a vertical line (negates the x distance from center, a
   * left/right flip).
   */
  mirror(
    points: readonly SpiralLevelPoint[],
    center: SpiralLevelPoint,
    axis: MirrorAxis,
  ): SpiralLevelPoint[] {
    const [centerX, centerY] = center;

    return points.map(([x, y]): SpiralLevelPoint => {
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
  rotate(
    points: readonly SpiralLevelPoint[],
    center: SpiralLevelPoint,
    quarterTurns: number,
  ): SpiralLevelPoint[] {
    const normalizedTurns = ((quarterTurns % 4) + 4) % 4;

    if (normalizedTurns === 0) {
      return [...points];
    }

    const [centerX, centerY] = center;

    return points.map(([x, y]): SpiralLevelPoint => {
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
