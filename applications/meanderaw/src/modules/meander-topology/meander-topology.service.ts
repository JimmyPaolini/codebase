import { Inject, Injectable } from "@nestjs/common";

import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";

import type {
  LatticeGraph,
  LatticePoint,
} from "../meander-lattice/meander-lattice.types";
import type {
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
   * carve-out is load-bearing rather than a formality — 6,005 of the 9,942
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

  /** Marks every painted lattice point reachable from `start` along ink as visited. */
  private walk(
    graph: LatticeGraph,
    start: LatticePoint,
    visited: Set<string>,
  ): void {
    const pending: LatticePoint[] = [start];

    visited.add(this.key(start.column, start.row));

    while (pending.length > 0) {
      const point = pending.pop();

      if (point === undefined) {
        break;
      }

      for (const neighbor of this.neighbors(graph, point)) {
        const key = this.key(neighbor.column, neighbor.row);

        if (!visited.has(key)) {
          visited.add(key);
          pending.push(neighbor);
        }
      }
    }
  }

  // 🌎 Public Methods

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
   * `branch` is a single loop-free tree. See {@link InkConnectivity} for
   * the arithmetic that turns them into those words, and
   * `meander-topology.service.integration.test.ts` for the assertion that
   * fixes both ends of `negative`'s range.
   */
  connectivity(document: string): InkConnectivity {
    const graph = this.meanderLatticeService.build(document);
    const visited = new Set<string>();
    let components = 0;
    let freeEnds = 0;

    for (let column = 0; column <= graph.columns; column += 1) {
      for (let row = 0; row <= graph.rows; row += 1) {
        const key = this.key(column, row);

        freeEnds += this.inkDegree(graph, column, row) === 1 ? 1 : 0;

        if (graph.nodes.has(key) && !visited.has(key)) {
          components += 1;
          this.walk(graph, { column, row }, visited);
        }
      }
    }

    return {
      components,
      edges: graph.horizontalEdges.size + graph.verticalEdges.size,
      freeEnds,
      nodes: graph.nodes.size,
    };
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
