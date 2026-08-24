import { Injectable } from "@nestjs/common";

import type { SpiralLevelPoint } from "./meander-generation.types";

/**
 * Generates the zigzag point sequence `snake` and `chain` both share, one
 * repeat unit at a time, in grid levels rather than pixels. The sequence
 * visits every one of `rows - 1` horizontal grid lines exactly once, each
 * with a span that shrinks from the outer edge toward the center and grows
 * back out toward the opposite edge — `chain` renders the identical
 * sequence with its single center-connecting segment omitted.
 */
@Injectable()
export class SnakeSequenceService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The order rows are visited in, as an inward-then-outward zigzag: the
   * top edge, then the bottom edge, then ascending from the third row up to
   * the second-to-last, then the second row, then the bottom edge.
   * `maximumLevel === 3` is handled directly since the general construction
   * would otherwise place row 2 twice (both as `maximumLevel - 1` and as
   * the fixed landmark).
   */
  private rowOrder(maximumLevel: number): number[] {
    if (maximumLevel === 3) {
      return [1, 2, 3];
    }

    const ascendingMiddleRows = Array.from(
      { length: Math.max(0, maximumLevel - 4) },
      (_value, index) => index + 3,
    );

    return [1, maximumLevel - 1, ...ascendingMiddleRows, 2, maximumLevel];
  }

  /**
   * The `[left, right]` grid-level span of one row's horizontal segment.
   * Rows at or before the halfway point compute their span directly; rows
   * past it mirror the span of their counterpart on the other side, since
   * {@link rowSpanWidth} is itself symmetric around the center.
   */
  private rowSpan(row: number, maximumLevel: number): SpiralLevelPoint {
    const halfwayRow = Math.ceil(maximumLevel / 2);

    if (row <= halfwayRow) {
      const left = row - 1;
      return [left, left + this.rowSpanWidth(row, maximumLevel)];
    }

    const mirrorRow = maximumLevel + 1 - row;
    const left = mirrorRow;
    return [left, left + this.rowSpanWidth(mirrorRow, maximumLevel)];
  }

  /**
   * How wide a row's horizontal segment is: shrinking by two grid levels
   * per row moving inward from either edge, clamped to a minimum of one so
   * the row nearest the center never collapses to a single point.
   */
  private rowSpanWidth(row: number, maximumLevel: number): number {
    const distanceFromNearestEdge = Math.min(row - 1, maximumLevel - row);
    return Math.max(maximumLevel - 1 - 2 * distanceFromNearestEdge, 1);
  }

  // 🌎 Public Methods

  /**
   * Traces the full zigzag for one unit, in grid levels. `rows - 1` is the
   * highest grid level the sequence reaches in both directions.
   */
  points(rows: number): readonly SpiralLevelPoint[] {
    const maximumLevel = rows - 1;
    const order = this.rowOrder(maximumLevel);
    const sequence: SpiralLevelPoint[] = [[0, 1]];
    let currentXLevel = 0;

    order.forEach((row, index) => {
      const [left, right] = this.rowSpan(row, maximumLevel);

      if (index === 0) {
        sequence.push([right, row]);
        currentXLevel = right;
        return;
      }

      if (currentXLevel === left) {
        sequence.push([left, row], [right, row]);
        currentXLevel = right;
      } else {
        sequence.push([right, row], [left, row]);
        currentXLevel = left;
      }
    });

    sequence.push([currentXLevel, 1]);

    return sequence;
  }
}
