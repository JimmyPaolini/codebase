import { Injectable } from "@nestjs/common";

import type {
  AlternateRun,
  DotShape,
  MirrorAxis,
  MotifLevelPoint,
} from "./meander-generation.types";

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
   * Splits the closed level interval `[levelStart, levelEnd]` into
   * consecutive runs of `runLength` grid levels each, alternating which of
   * two columns (`0`/`1`) draws each run. Doesn't fit the
   * point-sequence-in/point-sequence-out shape `rotate`/`mirror` share (the
   * same exception {@link closeEdge} documents): `bars`'s vertical bar is
   * drawn as several disconnected segments rather than one continuous
   * polyline, so there is no single point sequence to transform — only a
   * pair of columns and a level range to split between them.
   *
   * A generic capability, independent of `bars`'s own `alternated`
   * modifier: `BarsMotifService.alternatedPath` always calls this with
   * `runLength = 1` (verified exact against the `5`, `7`, and `8` rows
   * "bars alternated" reference files — the run switches column every
   * single grid level) and uses the modifier's `period` parameter
   * separately, to control how many real columns the repeat tile spans
   * rather than how long a vertical run is. See
   * {@link BarsMotifService.alternatedPath} for that derivation, including
   * why the reference set's "bars alternated 2"/"alternated 3" files'
   * interior zigzag pattern (as opposed to their column span, which IS a
   * clean, confirmed `2 * period` progression) is hand-mangled and
   * unrecoverable as one rule.
   */
  alternate(
    levelStart: number,
    levelEnd: number,
    runLength: number,
  ): AlternateRun[] {
    const runs: AlternateRun[] = [];
    let currentLevel = levelStart;
    let runIndex = 0;

    while (currentLevel < levelEnd) {
      const runEnd = Math.min(currentLevel + runLength, levelEnd);

      runs.push({
        column: runIndex % 2 === 0 ? 0 : 1,
        fromLevel: currentLevel,
        toLevel: runEnd,
      });
      currentLevel = runEnd;
      runIndex += 1;
    }

    return runs;
  }

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
   * Computes one full period's dot levels for `bars`'s `dot` modifier: the
   * grid level each phase in the repeat tile marks with a dot instead of a
   * fully-drawn run. `"up"` steps straight down through every level once per
   * period, then resets to the top — a monotonic staircase, confirmed
   * against `6 rows bars dot up.svg` (period 3: levels `5, 3, 1`) and
   * `8 rows bars dot up.svg` (period 4: levels `7, 5, 3, 1`). `"bounce"`
   * mirrors back up through the interior levels before repeating, so the
   * two extreme levels are each visited once per period and every interior
   * level twice — confirmed against
   * `6 rows bars dot bounce.svg` (period 4: levels `5, 3, 1, 3`) and
   * `8 rows bars dot bounce.svg` (period 6: levels `7, 5, 3, 1, 3, 5`).
   *
   * Every level in the sequence must be odd, regardless of `rows`'s parity:
   * {@link BarsMotifService.dotPath} only renders a dot as a visible break
   * when BOTH grid-unit runs immediately adjacent to it get skipped, and
   * that only happens at an odd level (see `dotPath`'s own doc comment for
   * why). At even `rows`, `rows - 1` is already odd, so the sequence starts
   * there; at odd `rows`, `rows - 1` is even, so the sequence starts one
   * level lower, at `rows - 2` — the top-most level a dot can actually sit
   * at without being silently swallowed by an adjacent drawn run. This
   * one-level trim at odd `rows` is unverified against a real reference
   * file (none exists below 6 rows for `dot`), but follows directly from
   * `dotPath`'s draw-or-skip rule, which IS verified.
   */
  dotLevels(rows: number, shape: DotShape): number[] {
    const maximumLevel = rows % 2 === 0 ? rows - 1 : rows - 2;
    const levelCount = Math.floor((maximumLevel - 1) / 2) + 1;
    const levels = Array.from(
      { length: levelCount },
      (_value, index) => maximumLevel - 2 * index,
    );

    if (shape === "up") {
      return levels;
    }

    const mirroredLevels = levels.slice(1, -1).toReversed();

    return [...levels, ...mirroredLevels];
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
