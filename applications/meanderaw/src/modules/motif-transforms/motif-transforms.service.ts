import { Injectable } from "@nestjs/common";

import type { DotShape } from "../meander-generation/meander-generation.types";
import type {
  AlternateRun,
  MirrorAxis,
  MotifLevelPoint,
  MotifLevelSpan,
} from "./motif-transforms.types";

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
   * same exception {@link closeEdge} documents): `mosaic`'s vertical bar is
   * drawn as several disconnected segments rather than one continuous
   * polyline, so there is no single point sequence to transform — only a
   * pair of columns and a level range to split between them.
   *
   * A generic capability, independent of `mosaic`'s own `alternated`
   * modifier: `MosaicMotifService.alternatedPath` always calls this with
   * `runLength = 1` (the run switches column every single grid level) and
   * uses the modifier's `period` parameter separately, to control how many
   * real columns the repeat tile spans rather than how long a vertical run
   * is. This is the raw split only — pass the result through
   * {@link columnSpans} to get the spans one column actually draws.
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
   * Selects the level spans one column of an {@link alternate} split
   * actually draws, merging the consecutive ones. Alongside its own runs, a
   * column always draws the split's first and last run, whichever column
   * they were assigned to, so a skipped run can never sit against either end
   * of the level range. Shares {@link alternate}'s and {@link closeEdge}'s
   * exception to the point-sequence-in/point-sequence-out shape
   * `rotate`/`mirror` keep, for the same reason: it describes disconnected
   * segments, not one polyline.
   *
   * That end rule is what keeps `mosaic` space-filling. A `mosaic` column's
   * drawn range stops one grid level short of each cap tick, so a skipped
   * run at either end would butt against that cap gap and leave two grid
   * levels of white — three times the stroke width, since
   * `stroke-linecap="square"` gives back a quarter unit at each end.
   * Anywhere else a skipped run is bounded by drawn runs on both sides and
   * leaves exactly one grid level, which renders as exactly one stroke
   * width: the same white channel that separates two neighboring bars.
   */
  columnSpans(runs: readonly AlternateRun[], column: 0 | 1): MotifLevelSpan[] {
    const spans: MotifLevelSpan[] = [];

    for (const [index, run] of runs.entries()) {
      const isEndRun = index === 0 || index === runs.length - 1;

      if (run.column !== column && !isEndRun) {
        continue;
      }

      const previousSpan = spans.at(-1);

      if (previousSpan?.toLevel === run.fromLevel) {
        spans[spans.length - 1] = {
          fromLevel: previousSpan.fromLevel,
          toLevel: run.toLevel,
        };
        continue;
      }

      spans.push({ fromLevel: run.fromLevel, toLevel: run.toLevel });
    }

    return spans;
  }

  /**
   * Computes one full period's dot levels for `mosaic`'s `dot` modifier: the
   * grid level each phase in the repeat tile marks with a dot. The ladder
   * starts flush against the bar's bottom end, `rows - 1`, steps two levels
   * up at a time, and always finishes on the bar's top end, level `1` — at
   * an odd row count that makes the final step three levels rather than two,
   * which is what keeps the ladder clear of levels `2` and `rows - 2`.
   * {@link MosaicMotifService.dotPath} gives up the level either side of the
   * dot, so a dot on one of those two would leave the last grid level with
   * nothing but a bare square mark on it — indistinguishable from the dot
   * itself. `"up"` walks the ladder once per period and resets; `"bounce"`
   * mirrors back down through the interior levels before repeating.
   *
   * At `6` rows that is `5, 3, 1` for `"up"` and `5, 3, 1, 3` for
   * `"bounce"`; at `7` rows, `6, 4, 1` and `6, 4, 1, 4`. The period — and so
   * the repeat tile's column count, and the canvas width
   * {@link MosaicMotifService.rightEdge} derives from it — is
   * `floor((rows - 2) / 2) + 1` at every row count, odd and even alike.
   */
  dotLevels(rows: number, shape: DotShape): number[] {
    const maximumLevel = rows - 1;
    const levelCount = Math.floor((maximumLevel - 1) / 2) + 1;
    const levels = [
      ...Array.from(
        { length: levelCount - 1 },
        (_value, index) => maximumLevel - 2 * index,
      ),
      1,
    ];

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
