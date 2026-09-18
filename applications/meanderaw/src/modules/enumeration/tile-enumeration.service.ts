import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { EDGE_BUDGET, OversizedTileError } from "./enumeration.constants";

import type { EdgesDraft, Tile, TileShape } from "../tile/tile.types";
import type {
  EdgeAddress,
  Environment,
  TileEnumerationState,
} from "./enumeration.types";

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
 * One number bounds it. `SWEEP_EDGE_BUDGET` — read through
 * {@link ConfigService}, defaulting to `EDGE_BUDGET` — is a ceiling on the
 * whole *tile*: how many edges it may hold, which is what keeps the space
 * small enough to look through, since the count is `2 ** edges` before
 * folding. There was once a second, a ceiling on how many direction bits one
 * *point* could carry, and it is gone: a point may carry any of the sixteen
 * patterns, junctions and crossings included, so the budget is the only
 * thing bounding the space and it has to be.
 *
 * The result is folded by symmetry class — a tile
 * repeats forever, so a shift or a mirror of one tile is not another — and
 * `SymmetryService.canonicalTile` picks which member of a class the
 * corpus draws. Which member the walk happens to reach first therefore does
 * not matter.
 *
 * Nothing here knows what a tile is called. The fold is keyed on
 * `SymmetryService.edgeKey`, so the naming this family's filenames use
 * can depend on this module without this module depending back on it.
 */
@Injectable()
export class TileEnumerationService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SymmetryService)
    private readonly symmetryService: SymmetryService,
    @Inject(TileService)
    private readonly tileService: TileService,
    @Inject(ConfigService)
    configService: ConfigService<Environment>,
  ) {
    this.edgeBudget =
      configService.get<number>("SWEEP_EDGE_BUDGET") ?? EDGE_BUDGET;
  }

  // 🔐 Private Fields

  /**
   * How many edges one tile may hold, read once from `SWEEP_EDGE_BUDGET` at
   * construction — startup validates the schema, so a malformed or
   * out-of-range budget never reaches a running sweep.
   */
  private readonly edgeBudget: number;

  /**
   * Every shape already enumerated, keyed by `rows x columns`.
   *
   * Enumeration is a pure function of a shape and walks `2 ** edges`
   * assignments, so at the budget's largest shapes it is 32,768 of them —
   * and the sweep, the charter measurement, and several tests each ask for
   * the same shapes more than once. Keeping the answer is what makes asking
   * again free.
   */
  private readonly tilesByShape = new Map<string, Tile[]>();

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Where the `ordinal`-th edge sits in a draft: the grid that holds it, and its level and column within that grid. */
  private address(
    edges: EdgesDraft,
    shape: TileShape,
    ordinal: number,
  ): EdgeAddress {
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
   * Nothing prunes, because nothing can: every assignment of every edge is a
   * tile now, so a partial one is never doomed. What used to be a
   * backtracking search over covers is counting in binary, and what keeps it
   * finite is that the budget refused the shape before the walk began.
   */
  private assign(ordinal: number, enumeration: TileEnumerationState): void {
    const { edges, shape } = enumeration;

    if (ordinal === this.edges(shape)) {
      this.record(enumeration);

      return;
    }

    this.assign(ordinal + 1, enumeration);
    this.set(edges, shape, ordinal);
    this.assign(ordinal + 1, enumeration);
    this.clear(edges, shape, ordinal);
  }

  /** Clears the `ordinal`-th edge of a draft, undoing {@link set} on the way back out of the walk. */
  private clear(edges: EdgesDraft, shape: TileShape, ordinal: number): void {
    const { column, grid, level } = this.address(edges, shape, ordinal);
    const row = grid[level];

    if (row !== undefined) {
      row[column] = false;
    }
  }

  /**
   * Keeps the tile the current assignment describes, unless a tile already
   * found draws the same pattern.
   *
   * The key is the representative's own edge key rather than the name a
   * drawing carries. Both are constant across a symmetry class and tell two
   * classes of one shape apart, so either folds the walk identically — and
   * the edge key is the one this module can read without depending on the
   * spelling.
   */
  private record(enumeration: TileEnumerationState): void {
    const { edges, shape, tilesByKey } = enumeration;
    const tile = this.tileService.build(shape, edges);
    const representative = this.symmetryService.canonicalTile(tile);
    const key = this.symmetryService.edgeKey(representative);

    if (!tilesByKey.has(key)) {
      tilesByKey.set(key, representative);
    }
  }

  /** Sets the `ordinal`-th edge of a draft. */
  private set(edges: EdgesDraft, shape: TileShape, ordinal: number): void {
    const { column, grid, level } = this.address(edges, shape, ordinal);

    this.tileService.mark(grid, level, column);
  }

  // 🌎 Public Methods

  /**
   * How many edges a tile of this shape holds, which is both how many binary
   * decisions one tile is and what the configured edge budget bounds.
   */
  edges(shape: TileShape): number {
    return shape.columns * (2 * shape.rows - 3);
  }

  /**
   * Every distinct tile of the given size, one per symmetry class, ordered
   * by canonical edge key so the sweep is stable across runs.
   *
   * A shape the budget does not admit is refused rather than enumerated
   * slowly: the walk is `2 ** edges` wide, so one shape too many is not a
   * long run but an unfinished one.
   */
  enumerate(rows: number, columns: number): Tile[] {
    const shape: TileShape = { columns, rows };

    if (!this.isAdmitted(shape)) {
      throw new OversizedTileError(shape, this.edges(shape), this.edgeBudget);
    }

    const cached = this.tilesByShape.get(`${rows}x${columns}`);

    if (cached !== undefined) {
      return [...cached];
    }

    const enumeration: TileEnumerationState = {
      edges: this.tileService.blankEdges(shape),
      shape,
      tilesByKey: new Map<string, Tile>(),
    };

    this.assign(0, enumeration);

    const tiles = [...enumeration.tilesByKey.entries()]
      .toSorted(([first], [second]) => first.localeCompare(second))
      .map(([, tile]) => tile);

    this.tilesByShape.set(`${rows}x${columns}`, tiles);

    return [...tiles];
  }

  /** Whether a shape is small enough to enumerate, which is the only thing that decides it. */
  isAdmitted(shape: TileShape): boolean {
    return this.edges(shape) <= this.edgeBudget;
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
  isMatching(tile: Tile): boolean {
    for (const [level, row] of tile.points.entries()) {
      for (const [column] of row.entries()) {
        if (this.tileService.incidentEdges(tile, level, column) > 1) {
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
    return Math.max(Math.floor(this.edgeBudget / (2 * rows - 3)), 1);
  }
}
