import { Inject, Injectable } from "@nestjs/common";

import {
  EDGE_FAMILY_MODIFIER_NAMES,
  FLIP_ALTERNATION_MODIFIER_NAMES,
} from "./meander-generation.constants";
import { MotifTransformsService } from "./motif-transforms.service";

import type { Modifier, SpiralLevelPoint } from "./meander-generation.types";

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

  constructor(
    @Inject(MotifTransformsService)
    private readonly motifTransformsService: MotifTransformsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds bare `flip`'s fused repeat tile: a normal-oriented arm followed
   * by its mirror image, sharing the seam rather than each arm drawing its
   * own boundary. Verified against `5/6 rows chain/snake flip.svg`:
   * dropping the base sequence's final two points (the deepest row's own
   * pair, which only reaches the motif's un-flipped `rows - 1` edge)
   * leaves a `prefix` whose own last point always sits at grid level `1` —
   * the row-2 span's left edge is always `row - 1 = 1`, regardless of
   * `rows`. Mirroring that `prefix` about `(1 + pitch) / 2` sends grid
   * level `1` to exactly `pitch`, which is what turns the deepest row's
   * pair into one continuous run spanning the whole tile once the mirrored
   * copy is reversed and appended. The very last point of that reversed
   * mirror image would overshoot to `pitch + 1` (mirroring the prefix's
   * own first point, always at level `0`), so it's clamped back to
   * `pitch` — the same "manually close the tile" idea `points` itself
   * uses for its own un-mirrored final point.
   */
  private fusedFlipPoints(rows: number): readonly SpiralLevelPoint[] {
    const pitch = this.flipPitchLevels(rows);
    const prefix = this.points(rows).slice(0, -2);
    const center: SpiralLevelPoint = [(1 + pitch) / 2, 0];
    const mirroredSuffix = this.motifTransformsService
      .mirror(prefix, center, "vertical")
      .toReversed();
    const lastIndex = mirroredSuffix.length - 1;
    const [, lastYLevel] = mirroredSuffix[lastIndex] ?? [0, 0];
    const clampedSuffix = mirroredSuffix.with(lastIndex, [pitch, lastYLevel]);

    return [...prefix, ...clampedSuffix];
  }

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
   * How many grid levels bare `flip`'s fused tile spans: twice the motif's
   * own `rows - 2`, verified against `5 rows` (pitch 6) and `6 rows`
   * (pitch 8) reference geometry — not the same pitch `edge`/`edge-flip`
   * use, since `flip` fuses a mirrored twin into the same tile rather than
   * widening a single arm's border reach.
   */
  flipPitchLevels(rows: number): number {
    return 2 * (rows - 2);
  }

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

  /**
   * Applies the unit's modifier to the base zigzag, so `chain` and `snake`
   * share one place that decides how a modifier reshapes the sequence
   * before either one converts it to pixels. Bare `flip` returns the same
   * fused tile for every `unitIndex` — its mirrored twin is fused into the
   * tile itself (see {@link fusedFlipPoints}) rather than alternating
   * unit-by-unit, so there's nothing to key off `unitIndex` for. `edge`
   * closes the tile flush against the border; `edge-flip` does that AND
   * mirrors alternating units, same as before this fix — only bare `flip`
   * changed.
   */
  unitPoints(
    rows: number,
    unitIndex: number,
    modifier: Modifier | undefined,
  ): readonly SpiralLevelPoint[] {
    if (modifier?.name === "flip") {
      return this.fusedFlipPoints(rows);
    }

    const base = this.points(rows);
    const closed =
      modifier && EDGE_FAMILY_MODIFIER_NAMES.includes(modifier.name)
        ? this.motifTransformsService.closeEdge(base, rows)
        : base;
    const shouldMirror =
      modifier &&
      FLIP_ALTERNATION_MODIFIER_NAMES.includes(modifier.name) &&
      unitIndex % 2 === 1;

    if (!shouldMirror) {
      return closed;
    }

    return this.motifTransformsService.mirror(
      closed,
      [0, rows / 2],
      "horizontal",
    );
  }

  /**
   * How many grid levels one repeat unit spans: `rows` when the `edge`
   * family widens the pitch to close flush against the shared border,
   * `flipPitchLevels(rows)` for bare `flip`'s fused tile, otherwise the
   * motif's own `rows - 1`.
   */
  unitWidthLevels(rows: number, modifier: Modifier | undefined): number {
    if (modifier?.name === "flip") {
      return this.flipPitchLevels(rows);
    }

    if (modifier && EDGE_FAMILY_MODIFIER_NAMES.includes(modifier.name)) {
      return rows;
    }

    return rows - 1;
  }
}
