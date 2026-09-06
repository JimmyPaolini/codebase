import { Inject, Injectable } from "@nestjs/common";

import {
  MOSAIC_TILE_EDGE_BUDGET,
  MOSAIC_TILE_MAXIMUM_DEGREE,
  OversizedMosaicTileError,
} from "./mosaic-motif.constants";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";

import type {
  MosaicEdgeAddress,
  MosaicEdgesDraft,
  MosaicEnumeration,
  MosaicTile,
  MosaicTileShape,
} from "./mosaic-motif.types";

/**
 * Enumerates every distinct `mosaic` tile at a given size.
 *
 * A tile's degrees of freedom are its edges and nothing else: one eastward
 * edge and one southward edge per point, minus the last level's southward
 * ones, which have nowhere to reach. So the space at one shape is every
 * subset of them — `2^(columns * (2 * rows - 3))` in all — and enumerating
 * it is deciding each edge in turn rather than searching for an
 * arrangement, which is what makes the walk indifferent to what the tiles
 * mean.
 *
 * Two numbers bound it, and they bound different things.
 * {@link MOSAIC_TILE_MAXIMUM_DEGREE} is a ceiling on one *point* — how many
 * direction bits it may carry, which is what says whether the family can
 * turn a corner. {@link MOSAIC_TILE_EDGE_BUDGET} is a ceiling on the whole
 * *tile* — how many edges it may hold, which is what keeps the space small
 * enough to look through, since the count is `2 ** edges` before folding. Raising the
 * first without the second is what makes a lattice family explode.
 *
 * The point ceiling prunes as the walk goes rather than being checked at
 * the end, which is the whole of the old backtracking search's cleverness
 * restated as one comparison.
 *
 * Whatever the ceiling, the result is folded by symmetry class — a tile
 * repeats forever, so a shift or a mirror of one tile is not another — and
 * `MosaicSymmetryService.canonicalTile` picks which member of a class the
 * corpus draws. Which member the walk happens to reach first therefore does
 * not matter.
 */
@Injectable()
export class MosaicTilesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicSymmetryService)
    private readonly mosaicSymmetryService: MosaicSymmetryService,
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Where the `ordinal`-th edge sits in a draft: the grid that holds it, and its level and column within that grid. */
  private address(
    edges: MosaicEdgesDraft,
    shape: MosaicTileShape,
    ordinal: number,
  ): MosaicEdgeAddress {
    const { columns, rows } = shape;
    const horizontalCount = columns * (rows - 1);
    const isHorizontal = ordinal < horizontalCount;
    const local = isHorizontal ? ordinal : ordinal - horizontalCount;

    return {
      column: local % columns,
      grid: isHorizontal ? edges.horizontal : edges.vertical,
      level: Math.floor(local / columns),
    };
  }

  /**
   * Decides the `ordinal`-th edge both ways, recording a tile once every
   * edge is decided.
   *
   * Setting an edge is refused the moment it would push either of its points
   * past the ceiling, so a partial assignment that cannot become a tile is
   * abandoned rather than completed and discarded. That is the whole of the
   * old backtracking search's cleverness, and it is one comparison here.
   */
  private assign(ordinal: number, enumeration: MosaicEnumeration): void {
    const { edges, incident, shape } = enumeration;

    if (ordinal === this.edges(shape)) {
      this.record(enumeration);

      return;
    }

    this.assign(ordinal + 1, enumeration);

    const points = this.endpoints(shape, ordinal);

    if (points.some((point) => (incident[point] ?? 0) >= this.ceiling())) {
      return;
    }

    for (const point of points) {
      incident[point] = (incident[point] ?? 0) + 1;
    }

    this.set(edges, shape, ordinal);
    this.assign(ordinal + 1, enumeration);
    this.clear(edges, shape, ordinal);

    for (const point of points) {
      incident[point] = (incident[point] ?? 1) - 1;
    }
  }

  /** Clears the `ordinal`-th edge of a draft, undoing {@link set} on the way back out of the walk. */
  private clear(
    edges: MosaicEdgesDraft,
    shape: MosaicTileShape,
    ordinal: number,
  ): void {
    const { column, grid, level } = this.address(edges, shape, ordinal);
    const row = grid[level];

    if (row !== undefined) {
      row[column] = false;
    }
  }

  /**
   * The points the `ordinal`-th edge leaves a direction bit at, as
   * `level * columns + column` indices.
   *
   * Always two of them, and at a single column both are the same point —
   * which is right rather than a degeneracy to paper over: a wrapped edge
   * really does leave that point east *and* west, so it costs two of its
   * two-bit allowance and a point carrying one can carry nothing else.
   */
  private endpoints(shape: MosaicTileShape, ordinal: number): number[] {
    const { columns, rows } = shape;
    const horizontalCount = columns * (rows - 1);
    const isHorizontal = ordinal < horizontalCount;
    const local = isHorizontal ? ordinal : ordinal - horizontalCount;
    const level = Math.floor(local / columns);
    const column = local % columns;
    const own = level * columns + column;
    const reached = isHorizontal
      ? level * columns + ((column + 1) % columns)
      : (level + 1) * columns + column;

    return [own, reached];
  }

  /** Keeps the tile the current assignment describes, unless a tile already found draws the same pattern. */
  private record(enumeration: MosaicEnumeration): void {
    const { edges, shape, tilesByIdentifier } = enumeration;
    const tile = this.mosaicTileService.build(shape, edges);
    const identifier = this.mosaicSymmetryService.canonicalIdentifier(tile);

    if (!tilesByIdentifier.has(identifier)) {
      tilesByIdentifier.set(
        identifier,
        this.mosaicSymmetryService.canonicalTile(tile),
      );
    }
  }

  /** Sets the `ordinal`-th edge of a draft. */
  private set(
    edges: MosaicEdgesDraft,
    shape: MosaicTileShape,
    ordinal: number,
  ): void {
    const { column, grid, level } = this.address(edges, shape, ordinal);

    this.mosaicTileService.mark(grid, level, column);
  }

  // 🌎 Public Methods

  /**
   * The most direction bits one point may carry, which is two — a corner, or
   * a straight run through.
   *
   * A method rather than a bare constant read so the ceiling is one thing to
   * move, and so a caller can see it is a property of a point rather than of
   * a shape.
   */
  ceiling(): number {
    return MOSAIC_TILE_MAXIMUM_DEGREE;
  }

  /**
   * How many edges a tile of this shape holds, which is both how many binary
   * decisions one tile is and what {@link MOSAIC_TILE_EDGE_BUDGET} bounds.
   */
  edges(shape: MosaicTileShape): number {
    return shape.columns * (2 * shape.rows - 3);
  }

  /**
   * Every distinct tile of the given size, one per symmetry class, ordered
   * by canonical identifier so the sweep is stable across runs.
   *
   * A shape the budget does not admit is refused rather than enumerated
   * slowly: the walk is `2 ** edges` wide, so one shape too many is not a
   * long run but an unfinished one.
   */
  enumerate(rows: number, columns: number): MosaicTile[] {
    const shape: MosaicTileShape = { columns, rows };

    if (!this.isAdmitted(shape)) {
      throw new OversizedMosaicTileError(shape, this.edges(shape));
    }

    const enumeration: MosaicEnumeration = {
      edges: this.mosaicTileService.blankEdges(shape),
      incident: Array.from({ length: columns * (rows - 1) }, () => 0),
      shape,
      tilesByIdentifier: new Map<string, MosaicTile>(),
    };

    this.assign(0, enumeration);

    return [...enumeration.tilesByIdentifier.entries()]
      .toSorted(([first], [second]) => first.localeCompare(second))
      .map(([, tile]) => tile);
  }

  /** Whether a shape is small enough to enumerate, which is the only thing that decides it. */
  isAdmitted(shape: MosaicTileShape): boolean {
    return this.edges(shape) <= MOSAIC_TILE_EDGE_BUDGET;
  }

  /**
   * Whether every point of a tile is touched by at most one edge — the
   * family's original exact-cover rule, restated over the lattice.
   *
   * Each point claimed exactly once, by a dot on its own or by one half of a
   * dash, is exactly a matching: no two edges meet. The single-column
   * wrapped edge counts as the one edge it is, which is why the continuous
   * rule `lines` draws sits inside this region rather than outside it, even
   * though the ink really does leave that point in both directions.
   *
   * Nothing in the enumeration reads this. The ceiling on a point is on its
   * direction bits now, and this region is strictly inside that one — so it
   * is kept, and asserted shape by shape against the counts the old rule
   * produced, because reproducing that set exactly is what says the wider
   * space *contains* the narrower one rather than replacing it.
   */
  isMatching(tile: MosaicTile): boolean {
    for (const [level, row] of tile.points.entries()) {
      for (const [column] of row.entries()) {
        if (this.mosaicTileService.incidentEdges(tile, level, column) > 1) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * The widest column span the budget admits at a row count, which is at
   * least one at every row count the family draws in.
   *
   * The sweep asks per row rather than reading a column cap, which is what
   * makes the budget the single knob: five columns at three rows, one at
   * six, and the arithmetic between them says so rather than a table.
   */
  maximumColumns(rows: number): number {
    return Math.max(Math.floor(MOSAIC_TILE_EDGE_BUDGET / (2 * rows - 3)), 1);
  }
}
