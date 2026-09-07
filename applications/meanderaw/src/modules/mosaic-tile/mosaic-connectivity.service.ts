import { Inject, Injectable } from "@nestjs/common";

import { MeanderTopologyService } from "../meander-topology/meander-topology.service";

import { MosaicTileService } from "./mosaic-tile.service";

import type {
  InkAdjacency,
  InkConnectivity,
} from "../meander-topology/meander-topology.types";
import type { MosaicTile, MosaicTilePoint } from "./mosaic-tile.types";

/**
 * Reads one `mosaic` tile's ink as a graph, and answers the two questions
 * about it that no charter invariant fixes: whether it carries a loop, and
 * whether it is one connected figure or several.
 *
 * **It measures the tile, not a drawing of the tile.** A tile's eastward edge
 * at its last column reaches the first column of the *same* tile — that wrap
 * is the tile's own checked invariant, and it is what makes a tile join up
 * with its own next repeat. So a tile's points and edges already describe an
 * infinitely repeating band, and this reads that band the only way a finite
 * object can: as the band divided by its own repeat, one repeat's worth of
 * ink with the wrap left in. Every number here is therefore a property of the
 * tile alone, at no repeat count.
 *
 * Rendering the tile and measuring the document instead would answer a
 * different question, and the difference is not a subtlety. `bars` drawn six
 * times is six separate vertical strokes, so its document has six components;
 * drawn ten times, ten. The tile has one. Nothing about the tile changed
 * between those two drawings, which is what disqualifies the document count
 * from being the tile's.
 *
 * The two readings are still the same reading, and
 * `mosaic-connectivity.service.integration.test.ts` is where that is
 * asserted rather than claimed: a rendered document's ink is exactly this
 * band unrolled `N` times, plus the two cap-tick rules along the band's
 * borders — so a tile with no loop renders to a drawing with no loop, at
 * every repeat count. The converse fails, in one exactly-known way: a cycle
 * that closes only by wrapping — `lines`, whose every level leaves its own
 * point east and arrives back at it from the west — is a loop in the repeat
 * and a straight rule in the drawing, because unrolling it gives a line that
 * never returns. That gap is the whole of the difference between the two
 * counts, and `README.md` works it through.
 *
 * The walk itself is {@link MeanderTopologyService.components} and the
 * arithmetic is {@link MeanderTopologyService.isAcyclic}: this service
 * supplies the tile's own adjacency and nothing else. That direction is
 * deliberate — the topology service stays free of any knowledge that a
 * `mosaic` exists, which is the stance its own module documents.
 */
@Injectable()
export class MosaicConnectivityService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MeanderTopologyService)
    private readonly meanderTopologyService: MeanderTopologyService,
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** A tile's ink as an {@link InkAdjacency}, which is all {@link MeanderTopologyService.components} needs of it. */
  private adjacency(tile: MosaicTile): InkAdjacency<MosaicTilePoint> {
    return {
      key: ({ column, level }) => `${level},${column}`,
      neighbors: (point) => this.neighbors(tile, point),
      nodes: tile.points.flatMap((row, level) =>
        row.map((_directions, column) => ({ column, level })),
      ),
    };
  }

  /**
   * How many edges a tile holds, counted once each at the point that owns
   * them rather than twice from the direction bits.
   *
   * Counting the owned edges is what makes the arithmetic in
   * {@link InkConnectivity} hold at a single column, where the wrapped
   * eastward edge is one edge looping from a point back to itself: it is one
   * entry in the edge grid and two set direction bits, and it is the former
   * that is an edge. A self-loop adds an edge without adding a node, which is
   * exactly why `edges === nodes - components` reports it as the cycle it is.
   */
  private edgeCount(tile: MosaicTile): number {
    const { horizontal, vertical } = this.mosaicTileService.edges(tile);

    return this.markedEdges(horizontal) + this.markedEdges(vertical);
  }

  /**
   * How many of a tile's points carry exactly one arm of ink.
   *
   * {@link MosaicTileService.degree} counts direction bits, so at a single
   * column a wrapped eastward edge reads as two — and that is the honest
   * answer here rather than an inherited quirk: the ink really does leave
   * that point both ways, running off one side of the repeat and back in the
   * other, so nothing terminates there and it is not a free end.
   */
  private freeEnds(tile: MosaicTile): number {
    return tile.points
      .flat()
      .filter((directions) => this.mosaicTileService.degree(directions) === 1)
      .length;
  }

  /** How many edges one of a tile's two edge grids holds. */
  private markedEdges(grid: readonly (readonly boolean[])[]): number {
    return grid.reduce(
      (running, row) => running + row.filter(Boolean).length,
      0,
    );
  }

  /**
   * The points one step of ink away from `point`, wrapping east and west
   * around the tile's own column span and stopping at the band's first and
   * last level.
   *
   * The asymmetry between the two directions is the tile's, not a choice made
   * here. East and west wrap because a tile repeats horizontally forever, so
   * the column after the last is the first. North and south do not, because
   * grid levels `0` and `rows` are the band's cap ticks rather than tile
   * points — a point at the first level carries no `north` and one at the
   * last carries no `south`, so those steps are unset rather than pointing
   * somewhere that has to be excluded.
   */
  private neighbors(
    tile: MosaicTile,
    point: MosaicTilePoint,
  ): MosaicTilePoint[] {
    const { column, level } = point;
    const { columns } = tile;
    const directions = tile.points[level]?.[column];

    if (directions === undefined) {
      return [];
    }

    const steps = [
      { column: (column + 1) % columns, joined: directions.east, level },
      {
        column: (column - 1 + columns) % columns,
        joined: directions.west,
        level,
      },
      { column, joined: directions.north, level: level - 1 },
      { column, joined: directions.south, level: level + 1 },
    ];

    return steps
      .filter(({ joined }) => joined)
      .map(({ column: neighborColumn, level: neighborLevel }) => ({
        column: neighborColumn,
        level: neighborLevel,
      }));
  }

  // 🌎 Public Methods

  /**
   * One tile's ink counted as a graph — its points, the edges joining them,
   * how many connected pieces those edges leave, and how many points
   * terminate.
   *
   * Every point of a tile is a node, dots included: a point on no edge at all
   * is an inked dot drawn by a zero-length stroke, which is what makes every
   * mosaic space-filling for free. So `nodes` is the tile's full point count
   * at every tile, and a tile of nothing but dots is that many components.
   */
  connectivity(tile: MosaicTile): InkConnectivity {
    const adjacency = this.adjacency(tile);

    return {
      components: this.meanderTopologyService.components(adjacency),
      edges: this.edgeCount(tile),
      freeEnds: this.freeEnds(tile),
      nodes: adjacency.nodes.length,
    };
  }

  /** Whether a tile's ink carries no loop, counting a run that closes only by wrapping into the next repeat as the loop it is within one repeat. */
  isAcyclic(tile: MosaicTile): boolean {
    return this.meanderTopologyService.isAcyclic(this.connectivity(tile));
  }

  /** Whether a tile's ink is a single connected figure, which for a repeating band means connected up to the repeat rather than within one drawing of it. */
  isOneComponent(tile: MosaicTile): boolean {
    return this.meanderTopologyService.isOneComponent(this.connectivity(tile));
  }
}
