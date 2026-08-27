import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { DOT_MINIMUM_ROWS } from "../meander-generation/meander-generation.constants";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  DotShape,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "../meander-generation/meander-generation.types";
import type { MotifLevelSpan } from "../motif-transforms/motif-transforms.types";

/**
 * Draws the `mosaic` motif: a vertical bar spanning grid levels 1 through
 * `rows - 1`, capped by a short horizontal tick one grid unit wide at the
 * very top (level 0) and very bottom (level `rows`) of each column. Unlike
 * the spiral types, each unit is three disconnected segments rather than
 * one continuous polyline, so it builds its own path data instead of
 * reusing a shared points-to-path helper.
 */
@Injectable()
export class MosaicMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(MotifTransformsService)
    private readonly motifTransformsService: MotifTransformsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Draws the `alternated` modifier's zigzag. `period` controls the repeat
   * tile's column span — `2 * period` real columns per tile — confirmed
   * against `7 rows bars alternated.svg` (period 1, 2 columns),
   * `7 rows bars alternated 2.svg` (period 2, 4 columns), and
   * `7 rows bars alternated 3.svg` (period 3, 6 columns): all three decode
   * cleanly to `columns = 2 * period` at the same row count. The tile is
   * filled with `period` copies of the same period-1 interior zigzag, each
   * copy pairing column `tileStart + offset` in the tile's first half with
   * column `tileStart + period + offset` in its second half (`offset`
   * ranging over `0` through `period - 1`) — no half is a self-contained
   * zigzag on its own; the two halves interleave column-by-column.
   *
   * Each of the two columns takes its half of
   * {@link MotifTransformsService.alternate}'s unit-length split through
   * {@link MotifTransformsService.columnSpans}, so both columns draw the
   * split's first and last run and neither leaves a skipped run against a
   * cap tick.
   *
   * That end rule costs the zigzag at low row counts, unavoidably. Every
   * column has to carry ink on both its first and last grid unit, so with
   * the bar's `rows - 2` units down to two (4 rows) the only pattern left is
   * solid, and the tile is a pair of plain bars under one shared cap; with
   * three (5 rows) the only two are solid and one-gap-in-the-middle, so the
   * own column dashes and the neighbor column fills solid. From 6 rows up
   * the two columns are genuinely different patterns again and the zigzag
   * reads normally.
   */
  private alternatedPath(
    geometry: GridGeometry,
    unit: MotifUnit,
    period: number,
  ): string {
    const { isLastUnit, rows, unitIndex } = unit;
    const format = (value: number): string => this.format(value);
    const tileStartColumn = unitIndex * 2 * period;
    const runs = this.motifTransformsService.alternate(1, rows - 1, 1);
    const ownSpans = this.motifTransformsService.columnSpans(runs, 0);
    const neighborSpans = this.motifTransformsService.columnSpans(runs, 1);

    const runSegments = Array.from({ length: period }, (_value, offset) => {
      const ownColumnX =
        geometry.offset + (tileStartColumn + offset) * geometry.unit;
      const neighborColumnX =
        geometry.offset + (tileStartColumn + period + offset) * geometry.unit;

      return `${this.spanSegments(geometry, ownColumnX, ownSpans)}${this.spanSegments(
        geometry,
        neighborColumnX,
        neighborSpans,
      )}`;
    }).join("");

    const tileStartX = format(
      geometry.offset + tileStartColumn * geometry.unit,
    );
    const capRightX = format(
      geometry.offset +
        (tileStartColumn + this.capColumns(2 * period, isLastUnit)) *
          geometry.unit,
    );
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `${runSegments}M${tileStartX} ${capTopY}H${capRightX}M${tileStartX} ${capBottomY}H${capRightX}`;
  }

  /**
   * How many grid units the unit's two cap ticks span: its own tile's
   * `columns` for every interior unit, so the tick stays contiguous with
   * the next tile's own first column, and one less for the last unit,
   * which has no following tile to reach — a full-width tick there would
   * trail a bare stub one grid unit past the last column the tile actually
   * draws, and past the canvas edge {@link rightEdge} declares.
   *
   * A single-column tile's last unit therefore caps to zero length, which
   * `stroke-linecap="square"` renders as a small square mark centered on
   * the bar — exactly what the reference files' cropped canvases already
   * showed of it.
   */
  private capColumns(columns: number, isLastUnit: boolean): number {
    return isLastUnit ? columns - 1 : columns;
  }

  /**
   * Draws the `dot` modifier's overlay: widens each repeat unit's tile to
   * `period` real columns — `period` is `shape`'s dot-level sequence length
   * from {@link MotifTransformsService.dotLevels}, `4` for `bounce` and `3`
   * for `up` at 6 rows — and gives each of those columns its own dot level.
   *
   * A column draws the same bar every other `mosaic` variant draws, spanning
   * grid levels 1 through `rows - 1`, with the two grid levels either side
   * of its own dot level given up to the dot: the spans `[1, dotLevel - 1]`
   * and `[dotLevel + 1, rows - 1]`, with the dot's own mark centered in what
   * they leave behind. That is the tightest break the design's own
   * vocabulary allows — `stroke-linecap="square"` gives a quarter unit back
   * at each of the two endpoints facing across each half of it, so the dot
   * ends up with exactly one stroke width of white on either side: the same
   * channel that separates two neighboring bars. So the dot always reads as
   * a dot and is never swallowed into a continuous line.
   *
   * The span on the far side is dropped when the dot sits on a bar end
   * (levels `1` and `rows - 1`), where the cap tick frames the dot instead.
   * Neither span can collapse to a bare point: that needs a dot on level `2`
   * or `rows - 2`, and {@link MotifTransformsService.dotLevels} keeps the
   * ladder clear of both — a point would render as a square mark
   * indistinguishable from the dot one level away. Below
   * {@link DOT_MINIMUM_ROWS} rows the bar has no two levels to give up at
   * all, and {@link path} never routes here.
   */
  private dotPath(
    geometry: GridGeometry,
    unit: MotifUnit,
    shape: DotShape,
  ): string {
    const { isLastUnit, rows, unitIndex } = unit;
    const format = (value: number): string => this.format(value);
    const dotLevels = this.motifTransformsService.dotLevels(rows, shape);
    const period = dotLevels.length;
    const tileStartColumn = unitIndex * period;

    const phaseSegments = dotLevels
      .map((dotLevel, phase) => {
        const columnX =
          geometry.offset + (tileStartColumn + phase) * geometry.unit;
        const dotY = format(geometry.offset + dotLevel * geometry.unit);
        const barSpans: readonly MotifLevelSpan[] = [
          { fromLevel: 1, toLevel: dotLevel - 1 },
          { fromLevel: dotLevel + 1, toLevel: rows - 1 },
        ];
        const drawnSpans = barSpans.filter(
          (span) => span.fromLevel < span.toLevel,
        );

        return `${this.spanSegments(geometry, columnX, drawnSpans)}M${format(
          columnX,
        )} ${dotY}H${format(columnX)}`;
      })
      .join("");

    const tileStartX = format(
      geometry.offset + tileStartColumn * geometry.unit,
    );
    const capRightX = format(
      geometry.offset +
        (tileStartColumn + this.capColumns(period, isLastUnit)) * geometry.unit,
    );
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `${phaseSegments}M${tileStartX} ${capTopY}H${capRightX}M${tileStartX} ${capBottomY}H${capRightX}`;
  }

  /** Rounds and trims one pixel coordinate for interpolation into path data. */
  private format(value: number): string {
    return this.gridGeometryService.formatCoordinate(value);
  }

  /**
   * Serializes one column's already-chosen level spans into path data, as
   * one `M`-then-`V` vertical segment per span.
   */
  private spanSegments(
    geometry: GridGeometry,
    columnX: number,
    spans: readonly MotifLevelSpan[],
  ): string {
    const format = (value: number): string => this.format(value);

    return spans
      .map((span) => {
        const fromY = format(geometry.offset + span.fromLevel * geometry.unit);
        const toY = format(geometry.offset + span.toLevel * geometry.unit);

        return `M${format(columnX)} ${fromY}V${toY}`;
      })
      .join("");
  }

  /**
   * Draws the `split` modifier's dashed bar: breaks the continuous vertical
   * bar spanning grid levels 1 through `rows - 1` into dashes separated by
   * unit-length gaps, starting with a dash right below the top cap and
   * ending with one right above the bottom cap. The two caps themselves are
   * untouched.
   *
   * Verified by decoding `5 rows bars split.svg` (dash `[1,2]`, gap `[2,3]`,
   * dash `[3,4]`) and `7 rows bars split.svg` (dash `[1,2]`, gap `[2,3]`,
   * dash `[3,4]`, gap `[4,5]`, dash `[5,6]`) — both reference files also
   * carry small hand-authoring artifacts (a sub-pixel horizontal jog at
   * each dash endpoint, and one dash drawn in the opposite direction and
   * traced with a slightly different x-coordinate than every other
   * coordinate in the same file), which this implementation does not
   * reproduce since they're inconsistent even within a single file and
   * don't fit any single parameterized rule.
   *
   * Reuses {@link MotifTransformsService.alternate} with `runLength = 1`
   * over the same `[1, rows - 1]` level range `alternatedPath` already
   * splits between two columns, then keeps column `0`'s share of it through
   * {@link MotifTransformsService.columnSpans} — which is what turns the
   * split into a dash/gap pattern, and what guarantees the bar both starts
   * and ends on a dash. At an even row count the bar spans an even number
   * of grid units, so its final dash absorbs the gap that would otherwise
   * have ended it and runs two units long; at 4 rows that leaves a single
   * dash and the output is byte-identical to the unmodified bar, the same
   * way 3 rows already was.
   */
  private splitPath(geometry: GridGeometry, unit: MotifUnit): string {
    const { isLastUnit, rows, unitIndex } = unit;
    const format = (value: number): string => this.format(value);
    const columnX = geometry.offset + unitIndex * geometry.unit;
    const runs = this.motifTransformsService.alternate(1, rows - 1, 1);
    const dashSegments = this.spanSegments(
      geometry,
      columnX,
      this.motifTransformsService.columnSpans(runs, 0),
    );

    const capRightX = format(
      geometry.offset +
        (unitIndex + this.capColumns(1, isLastUnit)) * geometry.unit,
    );
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `${dashSegments}M${format(columnX)} ${capTopY}H${capRightX}M${format(
      columnX,
    )} ${capBottomY}H${capRightX}`;
  }

  // 🌎 Public Methods

  /**
   * Draws one repeat unit's bar and its two caps, as an SVG path attribute
   * value. `dot` below {@link DOT_MINIMUM_ROWS} rows falls through to the
   * unmodified bar: the bar is one grid level long there, with no room for
   * the two levels a dot gives up.
   */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { isLastUnit, modifier, rows, unitIndex } = unit;
    const format = (value: number): string => this.format(value);

    if (modifier?.name === "alternated") {
      return this.alternatedPath(geometry, unit, modifier.period);
    }

    if (modifier?.name === "dot" && rows >= DOT_MINIMUM_ROWS) {
      return this.dotPath(geometry, unit, modifier.shape);
    }

    if (modifier?.name === "split") {
      return this.splitPath(geometry, unit);
    }

    const columnX = format(geometry.offset + unitIndex * geometry.unit);
    const capRightX = format(
      geometry.offset +
        (unitIndex + this.capColumns(1, isLastUnit)) * geometry.unit,
    );
    const barTopY = format(geometry.offset + geometry.unit);
    const barBottomY = format(geometry.offset + (rows - 1) * geometry.unit);
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `M${columnX} ${barTopY}V${barBottomY}M${columnX} ${capTopY}H${capRightX}M${columnX} ${capBottomY}H${capRightX}`;
  }

  /**
   * The x-coordinate of the last unit's own column, before the
   * stroke-width margin — one full grid unit short of where an interior
   * unit's cap tick reaches. Verified against the `5`, `6`, and `8` rows
   * `bars.svg` reference files: each declared canvas width stops exactly at
   * this column plus `offset`. The reference files got there by cropping the
   * final cap's overshoot off the visible canvas; {@link capColumns} now
   * clips that cap flush with this edge instead, so nothing is drawn past
   * it in the first place.
   *
   * `alternated` widens each repeat unit's tile to `2 * period` columns
   * (see {@link alternatedPath}), so its last touched column is
   * `2 * period * repeatCount - 1` rather than `repeatCount - 1` —
   * verified against `5 rows bars alternated.svg`'s declared canvas width
   * at period 1. `dot` similarly widens each tile, to `period` columns
   * where `period` is the dot-level sequence length from
   * {@link MotifTransformsService.dotLevels} (see {@link dotPath}) —
   * verified against the declared canvas width of the `6`- and `8`-row
   * `"bars dot bounce"` and `"bars dot up"` reference files.
   */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    if (pattern.modifier?.name === "alternated") {
      return (
        geometry.offset +
        (2 * pattern.modifier.period * pattern.repeatCount - 1) * geometry.unit
      );
    }

    if (pattern.modifier?.name === "dot") {
      const period = this.motifTransformsService.dotLevels(
        pattern.rows,
        pattern.modifier.shape,
      ).length;

      return (
        geometry.offset + (period * pattern.repeatCount - 1) * geometry.unit
      );
    }

    return geometry.offset + (pattern.repeatCount - 1) * geometry.unit;
  }
}
