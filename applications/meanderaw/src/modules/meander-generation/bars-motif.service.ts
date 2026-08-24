import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";

import type {
  DotShape,
  GridGeometry,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "./meander-generation.types";

/**
 * Draws the `bars` motif: a vertical bar spanning grid levels 1 through
 * `rows - 1`, capped by a short horizontal tick one grid unit wide at the
 * very top (level 0) and very bottom (level `rows`) of each column. Unlike
 * the spiral types, each unit is three disconnected segments rather than
 * one continuous polyline, so it builds its own path data instead of
 * reusing a shared points-to-path helper.
 */
@Injectable()
export class BarsMotifService implements MotifService {
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
   * Draws the `alternated` modifier's zigzag. `period` controls the
   * repeat tile's column span — `2 * period` real columns per tile —
   * confirmed against `7 rows bars alternated.svg` (period 1, 2 columns),
   * `7 rows bars alternated 2.svg` (period 2, 4 columns), and
   * `7 rows bars alternated 3.svg` (period 3, 6 columns): all three decode
   * cleanly to `columns = 2 * period` at the same row count. The interior
   * zigzag pattern inside those wider tiles is hand-mangled in the
   * reference files (non-uniform edge density in `alternated 2`, an
   * incomplete second band stacked in `alternated 3`) and unrecoverable as
   * one parameterized rule, so each `period`-wide half of the tile is
   * filled with `period` side-by-side copies of the same period-1 interior
   * zigzag that's verified exact against the `5`, `7`, and `8` rows "bars
   * alternated" reference files — see
   * {@link MotifTransformsService.alternate} (always called here with a
   * fixed run length of `1`; `period` never reaches that argument).
   */
  private alternatedPath(
    geometry: GridGeometry,
    unit: MotifUnit,
    period: number,
  ): string {
    const { rows, unitIndex } = unit;
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);
    const tileStartColumn = unitIndex * 2 * period;
    const runs = this.motifTransformsService.alternate(1, rows - 1, 1);

    const runSegments = Array.from({ length: period }, (_value, offset) => {
      const ownColumnX =
        geometry.offset + (tileStartColumn + offset) * geometry.unit;
      const neighborColumnX =
        geometry.offset + (tileStartColumn + period + offset) * geometry.unit;

      return runs
        .map((run) => {
          const columnX = run.column === 0 ? ownColumnX : neighborColumnX;
          const fromY = geometry.offset + run.fromLevel * geometry.unit;
          const toY = geometry.offset + run.toLevel * geometry.unit;

          return `M${format(columnX)} ${format(fromY)}V${format(toY)}`;
        })
        .join("");
    }).join("");

    const tileStartX = format(
      geometry.offset + tileStartColumn * geometry.unit,
    );
    const capRightX = format(
      geometry.offset + (tileStartColumn + 2 * period) * geometry.unit,
    );
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `${runSegments}M${tileStartX} ${capTopY}H${capRightX}M${tileStartX} ${capBottomY}H${capRightX}`;
  }

  /**
   * Draws the `dot` modifier's overlay: widens each repeat unit's tile to
   * `period` real columns — `period` is `shape`'s dot-level sequence length
   * from {@link MotifTransformsService.dotLevels}, `4` for `bounce` and `3`
   * for `up` at 6 rows — and gives each of those columns its own dot level
   * plus a run pattern derived from it. A column's runs reuse
   * {@link MotifTransformsService.alternate}'s `[1, rows - 1]` division into
   * unit-length runs, alternating column `0`/`1`: a run below the column's
   * own dot level is drawn only if it's a column-`0` run, a run above only
   * if it's a column-`1` run (a run's level range never straddles the dot
   * level itself, since every run's midpoint is a half-integer and the dot
   * level is always a whole one). This draw-or-skip rule is also why
   * {@link MotifTransformsService.dotLevels} must only ever hand back odd
   * levels: at an odd level, BOTH the run immediately below it (ending at
   * that level) and the run immediately above it (starting at that level)
   * land on the "wrong" side of their own column check and get skipped,
   * leaving a real gap for the dot to sit in. At an even level, one of
   * those two adjacent runs lands on the "right" side and IS drawn,
   * silently swallowing the dot into what looks like one continuous run —
   * exactly what happened at every odd `rows` before `dotLevels` was fixed
   * to always emit odd levels regardless of `rows`'s parity (odd `rows`
   * makes `rows - 1` even, so a naive "count down from `rows - 1`" sequence
   * lands on even levels there). The dot itself is a zero-length path
   * segment at the column's own x and the dot level's y, which
   * `stroke-linecap="square"` renders as a small square mark. Verified by
   * decoding `6 rows bars dot bounce.svg`/`8 rows bars dot bounce.svg` and
   * `6 rows bars dot up.svg`/`8 rows bars dot up.svg`: both reference sets
   * carry the same small hand-authoring artifacts already documented on
   * {@link splitPath} (sub-pixel jogs at run/dot endpoints), which this
   * implementation does not reproduce.
   */
  private dotPath(
    geometry: GridGeometry,
    unit: MotifUnit,
    shape: DotShape,
  ): string {
    const { rows, unitIndex } = unit;
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);
    const dotLevels = this.motifTransformsService.dotLevels(rows, shape);
    const period = dotLevels.length;
    const runs = this.motifTransformsService.alternate(1, rows - 1, 1);
    const tileStartColumn = unitIndex * period;

    const phaseSegments = dotLevels
      .map((dotLevel, phase) => {
        const columnX = format(
          geometry.offset + (tileStartColumn + phase) * geometry.unit,
        );
        const dotY = format(geometry.offset + dotLevel * geometry.unit);

        const runSegments = runs
          .filter((run) => {
            const midpoint = (run.fromLevel + run.toLevel) / 2;
            return midpoint < dotLevel ? run.column === 0 : run.column === 1;
          })
          .map((run) => {
            const fromY = format(
              geometry.offset + run.fromLevel * geometry.unit,
            );
            const toY = format(geometry.offset + run.toLevel * geometry.unit);

            return `M${columnX} ${fromY}V${toY}`;
          })
          .join("");

        return `${runSegments}M${columnX} ${dotY}H${columnX}`;
      })
      .join("");

    const tileStartX = format(
      geometry.offset + tileStartColumn * geometry.unit,
    );
    const capRightX = format(
      geometry.offset + (tileStartColumn + period) * geometry.unit,
    );
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `${phaseSegments}M${tileStartX} ${capTopY}H${capRightX}M${tileStartX} ${capBottomY}H${capRightX}`;
  }

  /**
   * Draws the `split` modifier's dashed bar: breaks the continuous vertical
   * bar spanning grid levels 1 through `rows - 1` into unit-length dashes
   * separated by unit-length gaps, starting with a dash right below the top
   * cap. The two caps themselves are untouched.
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
   * splits between two columns — here every run stays on the bar's own
   * column, and only the runs on column `0` are drawn, which produces the
   * alternating dash/gap pattern directly.
   */
  private splitPath(geometry: GridGeometry, unit: MotifUnit): string {
    const { rows, unitIndex } = unit;
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);
    const columnX = format(geometry.offset + unitIndex * geometry.unit);
    const runs = this.motifTransformsService.alternate(1, rows - 1, 1);

    const dashSegments = runs
      .filter((run) => run.column === 0)
      .map((run) => {
        const fromY = format(geometry.offset + run.fromLevel * geometry.unit);
        const toY = format(geometry.offset + run.toLevel * geometry.unit);

        return `M${columnX} ${fromY}V${toY}`;
      })
      .join("");

    const capRightX = format(
      geometry.offset + unitIndex * geometry.unit + geometry.unit,
    );
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `${dashSegments}M${columnX} ${capTopY}H${capRightX}M${columnX} ${capBottomY}H${capRightX}`;
  }

  // 🌎 Public Methods

  /** Draws one repeat unit's bar and its two caps, as an SVG path attribute value. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const { modifier, rows, unitIndex } = unit;
    const format = (value: number): string =>
      this.gridGeometryService.formatCoordinate(value);

    if (modifier?.name === "alternated") {
      return this.alternatedPath(geometry, unit, modifier.period);
    }

    if (modifier?.name === "dot") {
      return this.dotPath(geometry, unit, modifier.shape);
    }

    if (modifier?.name === "split") {
      return this.splitPath(geometry, unit);
    }

    const columnX = format(geometry.offset + unitIndex * geometry.unit);
    const capRightX = format(
      geometry.offset + unitIndex * geometry.unit + geometry.unit,
    );
    const barTopY = format(geometry.offset + geometry.unit);
    const barBottomY = format(geometry.offset + (rows - 1) * geometry.unit);
    const capTopY = format(geometry.offset);
    const capBottomY = format(geometry.offset + rows * geometry.unit);

    return `M${columnX} ${barTopY}V${barBottomY}M${columnX} ${capTopY}H${capRightX}M${columnX} ${capBottomY}H${capRightX}`;
  }

  /**
   * The x-coordinate of the last unit's own column, before the
   * stroke-width margin — deliberately NOT the last unit's cap tick, which
   * overshoots one full grid unit further right. Verified against `5`, `6`,
   * and `8 rows bars.svg`: each reference file's declared canvas width
   * stops exactly at this column plus `offset`, cropping the final cap's
   * overshoot (which would otherwise reach into where a thirteenth,
   * nonexistent unit's column would start) off the visible canvas.
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
