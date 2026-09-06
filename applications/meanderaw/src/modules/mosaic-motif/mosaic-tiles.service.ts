import { Inject, Injectable } from "@nestjs/common";

import { MOSAIC_TILE_MAXIMUM_INCIDENT_EDGES } from "./mosaic-motif.constants";
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
 * What used to be an exact cover of cells by dots and one-unit dashes is
 * that same walk under one ceiling: no point may be touched by more than
 * {@link MOSAIC_TILE_MAXIMUM_INCIDENT_EDGES} edges. A cover claimed every
 * cell exactly once, by a dot on its own or by one half of a dash, which is
 * exactly a matching — so the rule is now a property of a point rather than
 * a shape the search is built around, and it prunes as the walk goes rather
 * than being checked at the end.
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

    if (ordinal === this.edgeCount(shape)) {
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

  /** How many edges a tile of this shape has, which is how many binary decisions one tile is. */
  private edgeCount(shape: MosaicTileShape): number {
    return shape.columns * (2 * shape.rows - 3);
  }

  /**
   * The points the `ordinal`-th edge touches, as `level × columns + column`
   * indices, with a single-column eastward edge yielding one point rather
   * than two — it wraps onto its own point, so it is one edge there however
   * many directions its ink leaves by.
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

    return own === reached ? [own] : [own, reached];
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
   * The most edges one point may be touched by. One, which is the family's
   * original exact-cover rule: every cell claimed exactly once.
   *
   * A method rather than a bare constant read so the ceiling is one thing to
   * move, and so a caller can see it is a property of a point rather than of
   * a shape.
   */
  ceiling(): number {
    return MOSAIC_TILE_MAXIMUM_INCIDENT_EDGES;
  }

  /**
   * Every distinct tile of the given size, one per symmetry class, ordered
   * by canonical identifier so the sweep is stable across runs.
   */
  enumerate(rows: number, columns: number): MosaicTile[] {
    const shape: MosaicTileShape = { columns, rows };
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
}
