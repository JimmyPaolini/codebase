import { Inject, Injectable } from "@nestjs/common";

import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";

import type {
  LatticeGraph,
  LatticePoint,
} from "../meander-lattice/meander-lattice.types";
import type {
  InkAdjacency,
  InkConnectivity,
  JunctionCounts,
  MeanderTopology,
} from "./meander-topology.types";

/**
 * Measures a rendered meander against the charter, and reports what it
 * found rather than whether it approves.
 *
 * It sits downstream of generation and consumes only the finished SVG, so it
 * measures a document nobody has just produced — a committed reference
 * asset, or a file someone else drew — exactly as it measures a fresh one.
 * Nothing here knows what a family is.
 *
 * Three of the seven invariants are measurable from the drawing alone:
 *
 * - **Space filling** (2) holds when every lattice point inside the band
 *   carries ink. That equivalence is what makes the check cheap, and it is
 *   worth stating: the drawing decomposes into half-pitch squares that are
 *   lattice points, edge runs, or cell interiors; a cell interior is always
 *   white; so a two-by-two white square — a gap wider than one stroke — can
 *   only occur around a lattice point nothing painted.
 * - **No branching** (3) is the count of lattice points where three arms of
 *   ink meet.
 * - **No crossing** (4) is the count where four do.
 *
 * The same two counts are taken of the white space, over the grid dual to
 * the ink's: one node per cell, joined to the neighboring cell wherever the
 * ink edge between them is missing. That is where this project's crossings
 * have always lived — `mosaic split` and `mosaic alternated period-3` cross
 * in the negative and nowhere else — so those two numbers are reported
 * rather than judged.
 */
@Injectable()
export class MeanderTopologyService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MeanderLatticeService)
    private readonly meanderLatticeService: MeanderLatticeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * A document's ink as an {@link InkAdjacency}, so {@link components} can
   * count its pieces without knowing it came from a lattice.
   *
   * The nodes are enumerated in column-then-row order, which is the order
   * {@link connectivity} used to walk them in. Nothing about a component
   * count depends on it — it is kept so that a change here is visible as a
   * change in behavior if it ever is one, rather than hidden behind an
   * ordering nobody fixed.
   */
  private adjacency(graph: LatticeGraph): InkAdjacency<LatticePoint> {
    const nodes: LatticePoint[] = [];

    for (let column = 0; column <= graph.columns; column += 1) {
      for (let row = 0; row <= graph.rows; row += 1) {
        if (graph.nodes.has(this.key(column, row))) {
          nodes.push({ column, row });
        }
      }
    }

    return {
      key: ({ column, row }) => this.key(column, row),
      neighbors: (point) => this.neighbors(graph, point),
      nodes,
    };
  }

  /** How many lattice points carry exactly one arm of ink — where a stroke stops rather than turning, forking, or closing. */
  private freeEnds(graph: LatticeGraph): number {
    let freeEnds = 0;

    for (let column = 0; column <= graph.columns; column += 1) {
      for (let row = 0; row <= graph.rows; row += 1) {
        freeEnds += this.inkDegree(graph, column, row) === 1 ? 1 : 0;
      }
    }

    return freeEnds;
  }

  /** How many arms of ink meet at one lattice point. */
  private inkDegree(graph: LatticeGraph, column: number, row: number): number {
    const arms = [
      graph.horizontalEdges.has(this.key(column - 1, row)),
      graph.horizontalEdges.has(this.key(column, row)),
      graph.verticalEdges.has(this.key(column, row - 1)),
      graph.verticalEdges.has(this.key(column, row)),
    ];

    return arms.filter(Boolean).length;
  }

  /**
   * Whether every lattice point inside the band carries ink.
   *
   * The first and last lattice column are skipped: that is where a band
   * terminates, and a gap there is invariant 7's, not invariant 2's. The
   * carve-out is load-bearing rather than a formality — 6,005 of the 9,863
   * committed documents have a termination gap, and not one of them has a
   * gap anywhere else. That count is asserted in
   * `meander-topology.service.integration.test.ts`, from this same lattice.
   */
  private isChannelWidthCompliant(graph: LatticeGraph): boolean {
    for (let column = 1; column < graph.columns; column += 1) {
      for (let row = 0; row <= graph.rows; row += 1) {
        if (!graph.nodes.has(this.key(column, row))) {
          return false;
        }
      }
    }

    return true;
  }

  /** The `"column,row"` key {@link MeanderLatticeService} records lattice points and one-pitch steps under. */
  private key(column: number, row: number): string {
    return `${column},${row}`;
  }

  /**
   * How many white corridors meet at one cell.
   *
   * A corridor runs between two cells of the document wherever the ink edge
   * that would separate them is missing. A cell on the canvas edge therefore
   * has fewer than four possible corridors: white that would escape the
   * document is not an arm of anything the document draws.
   */
  private negativeDegree(
    graph: LatticeGraph,
    column: number,
    row: number,
  ): number {
    const corridors = [
      column > 0 && !graph.verticalEdges.has(this.key(column, row)),
      column < graph.columns - 1 &&
        !graph.verticalEdges.has(this.key(column + 1, row)),
      row > 0 && !graph.horizontalEdges.has(this.key(column, row)),
      row < graph.rows - 1 &&
        !graph.horizontalEdges.has(this.key(column, row + 1)),
    ];

    return corridors.filter(Boolean).length;
  }

  /** The painted lattice points one step of ink away from `point`. */
  private neighbors(graph: LatticeGraph, point: LatticePoint): LatticePoint[] {
    const { column, row } = point;
    const steps = [
      {
        column: column - 1,
        joined: graph.horizontalEdges.has(this.key(column - 1, row)),
        row,
      },
      {
        column: column + 1,
        joined: graph.horizontalEdges.has(this.key(column, row)),
        row,
      },
      {
        column,
        joined: graph.verticalEdges.has(this.key(column, row - 1)),
        row: row - 1,
      },
      {
        column,
        joined: graph.verticalEdges.has(this.key(column, row)),
        row: row + 1,
      },
    ];

    return steps
      .filter(({ joined }) => joined)
      .map(({ column: neighborColumn, row: neighborRow }) => ({
        column: neighborColumn,
        row: neighborRow,
      }));
  }

  /** Records one degree as a three-armed junction, a four-armed one, or neither. */
  private tally(counts: JunctionCounts, degree: number): void {
    if (degree === 3) {
      counts.tJunctions += 1;
    }

    if (degree === 4) {
      counts.xJunctions += 1;
    }
  }

  /** Marks every node reachable from `start` along ink as visited. */
  private walk<Node>(
    adjacency: InkAdjacency<Node>,
    start: Node,
    visited: Set<string>,
  ): void {
    const pending: Node[] = [start];

    visited.add(adjacency.key(start));

    while (pending.length > 0) {
      const node = pending.pop();

      if (node === undefined) {
        break;
      }

      for (const neighbor of adjacency.neighbors(node)) {
        const key = adjacency.key(neighbor);

        if (!visited.has(key)) {
          visited.add(key);
          pending.push(neighbor);
        }
      }
    }
  }

  // 🌎 Public Methods

  /**
   * How many connected pieces an ink graph falls into, which is the one
   * quantity {@link InkConnectivity}'s two predicates cannot be computed
   * without and the one that costs a walk.
   *
   * It takes an {@link InkAdjacency} rather than a document because the
   * `mosaic` family asks this of a *tile* — a repeat unit whose ink wraps
   * east into its own first column — and a tile is not a document and never
   * becomes one. Rendering a tile in order to measure it would answer a
   * different question: a rendering of `N` repeats shows `N` copies of
   * whatever one repeat contains, so its component count says how many
   * repeats were drawn as much as it says anything about the tile. See
   * `MosaicConnectivityService`.
   */
  components<Node>(adjacency: InkAdjacency<Node>): number {
    const visited = new Set<string>();
    let components = 0;

    for (const node of adjacency.nodes) {
      if (!visited.has(adjacency.key(node))) {
        components += 1;
        this.walk(adjacency, node, visited);
      }
    }

    return components;
  }

  /**
   * Counts one rendered meander's ink as a graph: its painted lattice
   * points, the one-pitch steps joining them, and how many connected pieces
   * those steps leave.
   *
   * It is a second reading of the same lattice {@link measure} reads, kept
   * apart from it because it answers a different question. `measure`
   * reports the three charter invariants a drawing can be checked against;
   * these three numbers report the drawing's *shape as a graph*, which no
   * charter invariant fixes — the six original families are forests of many
   * components, `negative` is one to five components full of loops, and
   * `branch` is one connected piece with a loop in every column pair. See
   * {@link InkConnectivity} for the arithmetic that turns them into those
   * words, and `meander-topology.service.integration.test.ts` for the
   * assertion that fixes both ends of `negative`'s range and names which
   * families draw a tree at all.
   */
  connectivity(document: string): InkConnectivity {
    const graph = this.meanderLatticeService.build(document);

    return {
      components: this.components(this.adjacency(graph)),
      edges: graph.horizontalEdges.size + graph.verticalEdges.size,
      freeEnds: this.freeEnds(graph),
      nodes: graph.nodes.size,
    };
  }

  /**
   * Whether an ink graph carries no loop anywhere — a forest.
   *
   * The whole of it is `edges === nodes - components`, which is stated and
   * argued in {@link InkConnectivity} rather than here. It lives on this
   * service because the arithmetic belongs to the counts rather than to
   * whatever was counted: a tile and a document both reach it through the
   * same three numbers, and neither should restate the identity.
   */
  isAcyclic(connectivity: InkConnectivity): boolean {
    return connectivity.edges === connectivity.nodes - connectivity.components;
  }

  /**
   * Whether an ink graph is a single connected figure. Together with
   * {@link isAcyclic} this is a tree, which is what
   * {@link InkConnectivity} spells `components === 1 && edges === nodes - 1`.
   */
  isOneComponent(connectivity: InkConnectivity): boolean {
    return connectivity.components === 1;
  }

  /** Measures one rendered meander's channel widths and its ink and negative junction counts. */
  measure(document: string): MeanderTopology {
    const graph = this.meanderLatticeService.build(document);
    const ink: JunctionCounts = { tJunctions: 0, xJunctions: 0 };
    const negative: JunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (let column = 0; column <= graph.columns; column += 1) {
      for (let row = 0; row <= graph.rows; row += 1) {
        this.tally(ink, this.inkDegree(graph, column, row));
      }
    }

    for (let column = 0; column < graph.columns; column += 1) {
      for (let row = 0; row < graph.rows; row += 1) {
        this.tally(negative, this.negativeDegree(graph, column, row));
      }
    }

    return {
      channelWidthCompliant: this.isChannelWidthCompliant(graph),
      inkTJunctions: ink.tJunctions,
      inkXJunctions: ink.xJunctions,
      negativeTJunctions: negative.tJunctions,
      negativeXJunctions: negative.xJunctions,
    };
  }
}
