import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import { NegativeSourceService } from "./negative-source.service";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "../meander-generation/meander-generation.types";
import type { MosaicTile } from "../mosaic-motif/mosaic-motif.types";
import type {
  NegativeCell,
  NegativeOrientation,
  NegativeRowSpan,
  NegativeSpan,
  NegativeTileUnit,
} from "./negative-motif.types";

/**
 * Draws the `negative` motif: the white space of a `mosaic` pattern, inked.
 *
 * Nothing here invents a shape. A `mosaic` drawing divides its band into
 * cells, and the white between two neighboring cells is a **corridor**
 * wherever the ink wall that would separate them is missing — which is
 * exactly what `MeanderTopologyService` already counts when it reports a
 * document's negative T- and X-junctions. This family puts one lattice point
 * on every cell and one stroke along every corridor, so the drawing is the
 * corridor network itself rather than a rendering of an idea of it.
 *
 * Three consequences fall straight out of that construction, and each is
 * measured rather than assumed:
 *
 * - **It branches, and that is the point.** A cell where three corridors
 *   meet becomes a lattice point where three arms of ink meet, so this
 *   family's ink T-junction count is, identically, its source's negative
 *   T-junction count. That is charter invariant 3 relaxed on purpose, and it
 *   is declared as such in the charter property test — in every mode but
 *   `ruled-closed`, whose source is the `lines` sub-family and whose negative
 *   is the band's own rules with nothing joining them.
 * - **It crosses wherever its source does, and only there.** A cell where
 *   *four* corridors meet becomes a lattice point where four arms do, so the
 *   ink X-junction count is likewise its source's negative X-junction count.
 *   The three sources whose openings sit side by side — `brick-straight`,
 *   `brick-upright`, and `grid` — inherit crossings; the other seven inherit
 *   none. Invariant 4 is relaxed for exactly those three, by name.
 * - **It stays orthogonal and stays a band.** Every stroke is a one-pitch
 *   step along a lattice line, so only `M`, `H`, and `V` are ever emitted
 *   (invariant 1), and the canvas height comes from the shared geometry like
 *   every other family's (invariant 5).
 *
 * The geometry is **derived**, not attested. There is no hand-drawn
 * reference for a negative — the six older families have byte-exact
 * reference SVGs and this one has none — so its committed output in
 * `output/` is its own baseline, pinned by measurement rather than by
 * likeness.
 */
@Injectable()
export class NegativeMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(NegativeSourceService)
    private readonly negativeSourceService: NegativeSourceService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * One lattice column's corridors, as vertical path data.
   *
   * The corridor between cell `(column, row)` and `(column, row + 1)` is open
   * unless the source anchors a horizontal mark at that column and level: a
   * horizontal dash is the wall between a cell and the cell below it. Every
   * mark is one grid unit long, so its column repeats with the tile's own
   * period and a lattice column reads its mark modulo that period.
   */
  private columnPath(
    geometry: GridGeometry,
    tile: MosaicTile,
    column: number,
  ): string {
    const open = Array.from(
      { length: tile.rows - 1 },
      (_value, level) => !this.hasMark(tile, "horizontal", { column, level }),
    );

    return this.mergeRuns(open, 0, (from, to) =>
      this.verticalRun(geometry, column, { from, to }),
    );
  }

  /** One grid level as a formatted pixel coordinate; the grid is square, so a row and a column convert the same way. */
  private coordinate(geometry: GridGeometry, level: number): string {
    return this.gridGeometryService.formatCoordinate(
      geometry.offset + level * geometry.unit,
    );
  }

  /**
   * Whether the source anchors a wall of the given orientation at a lattice
   * column and interior level — which is to say whether that point owns an
   * edge leaving it that way. `"horizontal"` covers the single-column tile's
   * continuous rule too, which is the same eastward edge wrapping onto its
   * own point.
   */
  private hasMark(
    tile: MosaicTile,
    orientation: NegativeOrientation,
    cell: NegativeCell,
  ): boolean {
    const directions = tile.points[cell.level]?.[cell.column % tile.columns];

    if (directions === undefined) {
      return false;
    }

    return orientation === "vertical" ? directions.south : directions.east;
  }

  /** One horizontal run's path data, along `row` across the given lattice column span. */
  private horizontalRun(
    geometry: GridGeometry,
    row: number,
    columns: NegativeSpan,
  ): string {
    return `M${this.coordinate(geometry, columns.from)} ${this.coordinate(
      geometry,
      row,
    )}H${this.coordinate(geometry, columns.to)}`;
  }

  /**
   * The lattice column the drawing ends at: one short of the source's own,
   * because the negative puts a lattice point on each of the source's cells
   * and there is one fewer cell than there are lattice lines bounding them.
   */
  private lastColumn(tile: MosaicTile, repeatCount: number): number {
    return (repeatCount - 1) * tile.columns + this.reach(tile) - 1;
  }

  /**
   * Joins a run of consecutive open steps into as few path segments as the
   * lattice allows, rather than emitting one segment per step. `first` is the
   * lattice index `open[0]` starts at, and `draw` renders one merged run.
   */
  private mergeRuns(
    open: readonly boolean[],
    first: number,
    draw: (from: number, to: number) => string,
  ): string {
    const segments: string[] = [];
    let start: number | undefined = undefined;

    for (const [index, isOpen] of open.entries()) {
      if (isOpen && start === undefined) {
        start = first + index;
      }

      if (!isOpen && start !== undefined) {
        segments.push(draw(start, first + index));
        start = undefined;
      }
    }

    if (start !== undefined) {
      segments.push(draw(start, first + open.length));
    }

    return segments.join("");
  }

  /**
   * How many lattice columns past its own start the source's last repeat tile
   * reaches. A dash reaching right claims the column beyond the cell it is
   * anchored on, which is why a tile ending in horizontal marks declares a
   * wider canvas than one ending in dots at the same repeat count.
   *
   * The floor of one is load-bearing rather than defensive. A tile carrying
   * no rightward-reaching mark at all — a one-column tile of nothing but
   * dots or nothing but vertical dashes, which is what `grid` and
   * `brick-upright` are — measures zero here, and zero makes the last repeat
   * unit draw no column and no row at all while every unit before it has
   * already run its lattice row one column past its own: the drawing would
   * end on an unterminated horizontal step, one column past the canvas
   * {@link rightEdge} declares, with nothing closing it. Every tile occupies
   * at least the lattice column its own first cell sits on, so one is the
   * true floor and not a fudge. The three sources that predate those two all
   * measure one or two, so nothing about their committed output moves.
   */
  private reach(tile: MosaicTile): number {
    return Math.max(
      1,
      ...tile.points.flatMap((row) =>
        row.map((directions, column) => column + (directions.east ? 1 : 0)),
      ),
    );
  }

  /**
   * One lattice row's corridors across a repeat unit, as horizontal path
   * data.
   *
   * The corridor between cell `(column, row)` and `(column + 1, row)` is open
   * unless the source anchors a vertical mark on the lattice column between
   * them — a vertical dash spans a cell and the one below it, so it walls the
   * pair of cells to its right off from the pair to its left. It sits one
   * level above the row it walls.
   *
   * Both of the negative's outermost rows are therefore unbroken rules, and
   * the drawing closes as a band without any border being drawn for it. The
   * top row asks for a mark at level `-1`, which is above the band's first
   * interior level and so cannot exist. The bottom row asks for one at level
   * `rows - 2`, the tile's last interior level: a vertical dash claims its
   * own level and the one below, so the deepest one a tile can anchor is at
   * `rows - 3`, and that last level never carries one either.
   */
  private rowPath(
    geometry: GridGeometry,
    tile: MosaicTile,
    span: NegativeRowSpan,
  ): string {
    const open = Array.from(
      { length: Math.max(span.to - span.from + 1, 0) },
      (_value, index) =>
        !this.hasMark(tile, "vertical", {
          column: span.from + index + 1,
          level: span.row - 1,
        }),
    );

    return this.mergeRuns(open, span.from, (from, to) =>
      this.horizontalRun(geometry, span.row, { from, to }),
    );
  }

  /** One vertical run's path data, down `column` across the given lattice row span. */
  private verticalRun(
    geometry: GridGeometry,
    column: number,
    rows: NegativeSpan,
  ): string {
    return `M${this.coordinate(geometry, column)} ${this.coordinate(
      geometry,
      rows.from,
    )}V${this.coordinate(geometry, rows.to)}`;
  }

  // 🌎 Public Methods

  /**
   * Draws one repeat unit's corridors for a drawing named by type, rows, and
   * modifier — the `MotifService` contract every family implements. It
   * resolves the modifier to a source tile and hands the drawing itself to
   * {@link tilePath}, which is the same code the permutation half runs.
   */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    return this.tilePath(
      geometry,
      this.negativeSourceService.tile(
        this.negativeSourceService.source(unit.modifier),
        unit.rows,
      ),
      unit,
    );
  }

  /** The x-coordinate of the drawing's last lattice column, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    return this.tileRightEdge(
      geometry,
      this.negativeSourceService.tile(
        this.negativeSourceService.source(pattern.modifier),
        pattern.rows,
      ),
      pattern.repeatCount,
    );
  }

  /**
   * Draws one repeat unit's corridors: every vertical corridor down the
   * lattice columns this unit owns, and every horizontal corridor along them.
   *
   * A unit draws the horizontal corridor joining its own last column to the
   * next unit's first, so that join is drawn exactly once. The last unit
   * draws none past its own end and owns however many columns the source's
   * last tile actually reaches, which for a tile ending in dots is fewer than
   * the tile's full column span.
   *
   * It takes the tile rather than resolving one, because the source of a
   * drawing is not always a modifier: the permutation half enumerates tiles
   * no modifier names, and it inks them through this same method rather than
   * through a second copy of the geometry. That is what makes an enumerated
   * drawing and a named one the same drawing wherever they coincide.
   */
  tilePath(
    geometry: GridGeometry,
    tile: MosaicTile,
    unit: NegativeTileUnit,
  ): string {
    const from = unit.unitIndex * tile.columns;
    const to = from + (unit.isLastUnit ? this.reach(tile) : tile.columns) - 1;
    const columns = Array.from(
      { length: to - from + 1 },
      (_value, index) => from + index,
    );
    const rows = Array.from({ length: tile.rows }, (_value, row) => row);

    return [
      ...columns.map((column) => this.columnPath(geometry, tile, column)),
      ...rows.map((row) =>
        this.rowPath(geometry, tile, {
          from,
          row,
          to: unit.isLastUnit ? to - 1 : to,
        }),
      ),
    ].join("");
  }

  /** The x-coordinate the drawing of one tile ends at, before the stroke-width margin. */
  tileRightEdge(
    geometry: GridGeometry,
    tile: MosaicTile,
    repeatCount: number,
  ): number {
    return geometry.offset + this.lastColumn(tile, repeatCount) * geometry.unit;
  }
}
