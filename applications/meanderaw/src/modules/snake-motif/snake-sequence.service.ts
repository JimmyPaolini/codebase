import { Inject, Injectable } from "@nestjs/common";

import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";

import {
  EDGE_FAMILY_MODIFIER_NAMES,
  FLIP_ALTERNATION_MODIFIER_NAMES,
} from "./snake-motif.constants";

import type { Modifier } from "../meander-generation/meander-generation.types";
import type { MotifLevelPoint } from "../motif-transforms/motif-transforms.types";

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
  private fusedFlipPoints(rows: number): readonly MotifLevelPoint[] {
    const pitch = this.flipPitchLevels(rows);
    const prefix = this.points(rows).slice(0, -2);
    const center: MotifLevelPoint = [(1 + pitch) / 2, 0];
    const mirroredSuffix = this.motifTransformsService
      .mirror(prefix, center, "vertical")
      .toReversed();
    const lastIndex = mirroredSuffix.length - 1;
    const [, lastYLevel] = mirroredSuffix[lastIndex] ?? [0, 0];
    const clampedSuffix = mirroredSuffix.with(lastIndex, [pitch, lastYLevel]);

    return [...prefix, ...clampedSuffix];
  }

  /**
   * The order rows are visited in: the spiral's own itinerary, winding
   * inward from the top edge and unwinding back out to the bottom one.
   *
   * Every row's horizontal run is a fixed span (see {@link rowSpan}), and
   * every interior grid level is an endpoint of exactly two of those spans
   * — levels `0` and `maximumLevel` of exactly one each. So the spans chain
   * into a single path with two ends, and this is that path's order, in
   * closed form rather than searched for. Each row is entered at the level
   * the row before it left off, which is what makes consecutive runs turn
   * instead of doubling back.
   *
   * The inward half alternates an ascending odd row with a descending one —
   * `1`, `maximumLevel - 1`, `3`, `maximumLevel - 3`, and so on. The
   * outward half is that same half read backwards and reflected through
   * `maximumLevel + 1`, which is the symmetry the spans themselves have. At
   * an odd `maximumLevel` the inward half is one longer and ends on the
   * center row, which is visited once and has no reflection.
   *
   * Reading the itinerary off the chain rather than writing it out is what
   * fixes issue #507. The obvious-looking `1, maximumLevel - 1, 3, 4, 5, …`
   * agrees with the chain through eight rows and parts from it at nine, and
   * `maximumLevel === 3` needed a case of its own to stop it placing row 2
   * twice — both are symptoms of an itinerary that was never derived from
   * the spans it has to join up.
   */
  private rowOrder(maximumLevel: number): number[] {
    const inwardLength = Math.ceil(maximumLevel / 2);
    const inward = Array.from({ length: inwardLength }, (_value, index) =>
      index % 2 === 0 ? index + 1 : maximumLevel - index,
    );
    const outward = inward
      .slice(0, maximumLevel - inwardLength)
      .toReversed()
      .map((row) => maximumLevel + 1 - row);

    return [...inward, ...outward];
  }

  /**
   * The `[left, right]` grid-level span of one row's horizontal segment.
   * Rows at or before the halfway point compute their span directly; rows
   * past it mirror the span of their counterpart on the other side, since
   * {@link rowSpanWidth} is itself symmetric around the center.
   */
  private rowSpan(row: number, maximumLevel: number): MotifLevelPoint {
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
  points(rows: number): readonly MotifLevelPoint[] {
    const maximumLevel = rows - 1;
    const order = this.rowOrder(maximumLevel);
    const sequence: MotifLevelPoint[] = [[0, 1]];
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
  ): readonly MotifLevelPoint[] {
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
   * The rightmost grid level the zigzag itself reaches, as opposed to the
   * pitch its border spans: the `edge` family widens that pitch one level
   * past this (see {@link unitWidthLevels}) so consecutive units' borders
   * meet flush across the channel between them, and for every other
   * modifier the two agree.
   *
   * Independent of `unitIndex`, which is why it doesn't take one: the only
   * thing `unitIndex` changes in {@link unitPoints} is whether the
   * sequence is mirrored horizontally, and a horizontal mirror negates the
   * distance from center in `y` alone, leaving every `x` level untouched.
   */
  unitTraceRightLevel(rows: number, modifier: Modifier | undefined): number {
    return this.motifTransformsService.rightmostLevel([
      this.unitPoints(rows, 0, modifier),
    ]);
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
