import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import { CROSS_UNIT_COLUMNS } from "./cross-motif.constants";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "../meander-generation/meander-generation.types";
import type { CrossLevelSpan } from "./cross-motif.types";

/**
 * Draws the `cross` motif: two strips of fillet crossing one another at
 * continuous intervals — the form Calder Loth calls the complex Greek
 * meander. It is the only family whose ink contains X-junctions, and the
 * first degree-4 ink this project has ever drawn.
 *
 * The **warp** is a crenellated fillet running the length of the band: a
 * vertical bar in every interior column, spanning grid levels `1` through
 * `rows - 1`, with consecutive bars linked alternately at the top (level
 * `1`) and at the bottom (level `rows - 1`) so the whole run is one
 * continuous meandering line. The **weft** is a straight fillet along
 * {@link crossingLevel}, crossing every bar of the warp at a four-armed
 * `+`. Two band borders close the top and bottom.
 *
 * The shape looks plain because it is heavily constrained, as far as anyone
 * has been able to establish — not because a richer one was passed over.
 * Holding invariants 1, 2, 3, and 5 while relaxing 4 leaves very little
 * room: space-filling means every interior lattice point carries ink, and a
 * horizontal run may meet a vertical one only by crossing it outright or by
 * turning at its end — anything else is a T-junction, which invariant 3
 * forbids. A horizontal fillet therefore cannot turn anywhere a bar passes
 * through, so the weft runs the full width and only the warp meanders.
 *
 * That argument was arrived at by search, not by proof, and no test enforces
 * it: a construction that space-fills without a bar in every interior column
 * would overturn it. `docs/adr/0004-draw-crossings-as-a-one-pitch-interlace-break.md`
 * records what was searched and is careful to claim no more than that.
 *
 * The geometry is **derived**, not attested: the complex Greek meander is a
 * real ornament, but no reference SVG exists for this application's
 * rendering of it, and nothing here was checked byte-for-byte against a
 * hand-drawn original the way the six older families were. Its committed
 * output is its own baseline.
 */
@Injectable()
export class CrossMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** One warp bar's path data, drawn down `columnLevel` as one run or, under `interrupted`, as two. */
  private bar(
    geometry: GridGeometry,
    columnLevel: number,
    unit: MotifUnit,
  ): string {
    return this.barSpans(unit)
      .map((span) => this.verticalRun(geometry, columnLevel, span))
      .join("");
  }

  /**
   * Which stretches of a bar carry ink.
   *
   * Solid mode draws one run through the crossing, so the bar and the rail
   * share the lattice point and four arms of ink meet there. `interrupted`
   * gives up the grid level either side of it instead, so the rail reads as
   * passing over the bar. One whole grid level is the smallest break this
   * lattice admits — a shorter one would not sit on the grid at all — and it
   * leaves a white gap of exactly one stroke width, since a square line cap
   * gives back a quarter unit at each end. The bar's two remaining ends
   * still paint levels `crossing - 1` and `crossing + 1`, so no lattice
   * point loses its ink and invariant 2 holds unchanged.
   */
  private barSpans(unit: MotifUnit): readonly CrossLevelSpan[] {
    if (unit.modifier?.name !== "interrupted") {
      return [{ fromLevel: 1, toLevel: unit.rows - 1 }];
    }

    const crossing = this.crossingLevel(unit.rows);

    return [
      { fromLevel: 1, toLevel: crossing - 1 },
      { fromLevel: crossing + 1, toLevel: unit.rows - 1 },
    ];
  }

  /** One grid level as a formatted pixel coordinate; the grid is square, so a row and a column convert the same way. */
  private coordinate(geometry: GridGeometry, level: number): string {
    return this.gridGeometryService.formatCoordinate(
      geometry.offset + level * geometry.unit,
    );
  }

  /**
   * The grid level the weft rail runs along: the band's middle.
   *
   * It has to sit at least two levels inside the band: a rail on level `1`
   * or `rows - 1` would meet the bars at their own ends rather than crossing
   * them, and three arms of ink meeting is the T-junction invariant 3
   * forbids. That much holds from 4 rows up, which is as low as solid mode
   * would need to go.
   *
   * `STRUCTURAL_MINIMUM_ROWS.cross` is 6 rather than 4 for a different and
   * weaker reason, and one no measurement enforces: below 6 rows
   * {@link barSpans}'s upper span collapses to a zero-length run, so
   * `interrupted` draws a dot where it means to draw a strand passing under.
   * The drawing stays space-filling either way — see that constant's own
   * note, and the tests that pin it.
   */
  private crossingLevel(rows: number): number {
    return Math.floor(rows / 2);
  }

  /** One horizontal run's path data, along `rowLevel` across the given column span. */
  private horizontalRun(
    geometry: GridGeometry,
    rowLevel: number,
    columns: CrossLevelSpan,
  ): string {
    return `M${this.coordinate(geometry, columns.fromLevel)} ${this.coordinate(
      geometry,
      rowLevel,
    )}H${this.coordinate(geometry, columns.toLevel)}`;
  }

  /**
   * How many grid levels the whole pattern spans: two per repeat unit, plus
   * one. The extra level is what keeps every bar off the canvas edge, so a
   * rail's own end never lands on a bar and branches it.
   */
  private rightEdgeLevels(repeatCount: number): number {
    return CROSS_UNIT_COLUMNS * repeatCount + 1;
  }

  /** One vertical run's path data, down `columnLevel` across the given row span. */
  private verticalRun(
    geometry: GridGeometry,
    columnLevel: number,
    levels: CrossLevelSpan,
  ): string {
    return `M${this.coordinate(geometry, columnLevel)} ${this.coordinate(
      geometry,
      levels.fromLevel,
    )}V${this.coordinate(geometry, levels.toLevel)}`;
  }

  // 🌎 Public Methods

  /** Draws the two band borders and the weft rail between them, each spanning the full pattern width. */
  border(geometry: GridGeometry, pattern: RepeatPatternOptions): string {
    const columns: CrossLevelSpan = {
      fromLevel: 0,
      toLevel: this.rightEdgeLevels(pattern.repeatCount),
    };

    return (
      this.horizontalRun(geometry, 0, columns) +
      this.horizontalRun(geometry, pattern.rows, columns) +
      this.horizontalRun(geometry, this.crossingLevel(pattern.rows), columns)
    );
  }

  /**
   * Draws one repeat unit of the warp: two bars, the connector linking them
   * across the top, and the connector linking the second to the next unit's
   * first across the bottom. The last unit draws no bottom connector — there
   * is no next bar for it to reach, and a stub hanging off the end would be
   * ink the pattern does not close.
   */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const firstColumn = CROSS_UNIT_COLUMNS * unit.unitIndex + 1;
    const secondColumn = firstColumn + 1;
    const topLink = this.horizontalRun(geometry, 1, {
      fromLevel: firstColumn,
      toLevel: secondColumn,
    });
    const bottomLink = unit.isLastUnit
      ? ""
      : this.horizontalRun(geometry, unit.rows - 1, {
          fromLevel: secondColumn,
          toLevel: secondColumn + 1,
        });

    return (
      this.bar(geometry, firstColumn, unit) +
      this.bar(geometry, secondColumn, unit) +
      topLink +
      bottomLink
    );
  }

  /** The x-coordinate of the rail's right end, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    return (
      geometry.offset +
      this.rightEdgeLevels(pattern.repeatCount) * geometry.unit
    );
  }
}
