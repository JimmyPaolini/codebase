import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";

import type {
  AlternateRun,
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
   * one parameterized rule, so the tile is filled with `period` copies of
   * the same period-1 interior zigzag, each copy pairing column
   * `tileStart + offset` in the tile's first half with column
   * `tileStart + period + offset` in its second half (`offset` ranging over
   * `0` through `period - 1`) — no half is a self-contained zigzag on its
   * own; the two halves interleave column-by-column. This is verified
   * exact against the `5`, `7`, and `8` rows "bars alternated" reference
   * files — see
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
   * from {@link MotifTransformsService.dotLevels} — and gives each of those
   * columns its own dot level. A column's runs reuse
   * {@link MotifTransformsService.alternate}'s `[1, rows - 1]` split into
   * unit-length pieces, but only for that pre-split level range — the run's
   * `column` field (meaningful for {@link alternatedPath}'s two real,
   * alternating columns) doesn't apply here, since a dot phase draws to only
   * one column; which runs stay is decided by {@link isRunNeededAtDot}, so
   * the bar stays space-filling everywhere except right at the dot. This is
   * also why {@link MotifTransformsService.dotLevels} must only ever hand
   * back odd levels: a run's endpoints are whole numbers, and only a whole
   * dot level can land on one to open the gap the dot needs — an even level
   * would let every run draw straight through it, silently swallowing the
   * dot into what looks like one continuous run. The dot itself is a
   * zero-length path segment at the column's own x and the dot level's y,
   * which `stroke-linecap="square"` renders as a small square mark.
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
          .filter((run) => this.isRunNeededAtDot(run, { dotLevel, rows, runs }))
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
   * Whether `run` should still be drawn for a dot at `dotLevel`, given the
   * full `runs` sequence spanning `[1, rows - 1]`. A run untouched by the dot
   * (neither endpoint equals `dotLevel`) is always drawn. A run touching the
   * dot is normally dropped to open the gap the dot needs — except when it
   * alone reaches the bar's own structural edge (`fromLevel === 1` or
   * `toLevel === rows - 1`) that the dot itself isn't sitting on: dropping it
   * too would leave that edge permanently blank, since nothing else in the
   * sequence ever reaches past it to fill the gap. That exception only holds
   * when the dot has a second, distinct touching run on its other side —
   * that run's own drop is what keeps the dot visible, so this one is free
   * to stay. Without a second touching run (the dot's only neighbor spans
   * both of the bar's edges at once, as at `rows: 3`), dropping it is the
   * only way to avoid fully swallowing the dot.
   */
  private isRunNeededAtDot(
    run: AlternateRun,
    options: { dotLevel: number; rows: number; runs: readonly AlternateRun[] },
  ): boolean {
    const { dotLevel, rows, runs } = options;
    const touchesDot = run.fromLevel === dotLevel || run.toLevel === dotLevel;

    if (!touchesDot) {
      return true;
    }

    const touchingRuns = runs.filter(
      (candidate) =>
        candidate.fromLevel === dotLevel || candidate.toLevel === dotLevel,
    );

    if (touchingRuns.length < 2) {
      return false;
    }

    return (
      (run.fromLevel === 1 && dotLevel !== 1) ||
      (run.toLevel === rows - 1 && dotLevel !== rows - 1)
    );
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
