import { Inject, Injectable } from "@nestjs/common";

import { MeanderTopologyService } from "../meander-topology/meander-topology.service";

import type {
  MeanderPointDirections,
  MeanderPointGrid,
} from "../meander-decoding/meander-decoding.types";
import type { InkAdjacency } from "../meander-topology/meander-topology.types";
import type {
  MeanderConnectivity,
  MeanderGridEdge,
} from "./meander-characteristics.types";

/**
 * Reads a decoded Code's grid as a graph, and reports the three numbers no
 * charter invariant fixes: how many pieces the ink falls into, how many
 * loops it closes, and how many of its points terminate.
 *
 * They are the same three `MeanderTopologyService.connectivity` reports for
 * a *rendered document* — read here off the decoded grid directly,
 * for the same reason `MeanderCharacteristicsService` reads the junction
 * counts off it: a Code is what a meander now is, and measuring it should
 * not require rendering it first.
 *
 * **A grid is read as one repeat of a band, not as a finished drawing.** A
 * step east off the last column arrives at the first column of the same
 * grid, because that wrap is what makes a repeat unit join up with its own
 * next repeat. North and south do not wrap: the grid's first and last levels
 * sit against the band's two border rules, which are cap ticks rather than
 * points of the repeat. The consequence is worth stating:
 * a run that closes only by wrapping — every level leaving its own point
 * east and arriving back at it from the west — is a loop here and a straight
 * rule in the drawing.
 *
 * **An edge is claimed by either of its ends.** `MeanderDecodingService`
 * spells all four bits out per point and validates none of them, so a Code
 * may name an eastward edge at one point without the point it reaches
 * naming the matching westward one. Following only a point's own bits would
 * make the walk's answer depend on the order the grid is read in, which is
 * no property of the ink at all — so an edge is present when either end
 * claims it, and the graph is symmetric by construction whatever the Code
 * says. For a Code spelled from a well-formed tile the two readings agree,
 * since every edge there is written at both of its ends.
 *
 * A **self-loop** — a single-column grid's eastward edge, which leaves its
 * point and arrives back at it — is one edge incident to its point twice.
 * That is what keeps `cycles` reporting it as the loop it is, and what keeps
 * it out of `freeEnds`: the ink really does leave that point both ways,
 * running off one side of the repeat and back in the other, so nothing
 * terminates there.
 */
@Injectable()
export class MeanderConnectivityService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MeanderTopologyService)
    private readonly meanderTopologyService: MeanderTopologyService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The grid's edges as an {@link InkAdjacency}, which is all {@link MeanderTopologyService.components} needs of it. */
  private adjacency(
    grid: MeanderPointGrid,
    edges: readonly MeanderGridEdge[],
  ): InkAdjacency<string> {
    const neighbors = new Map<string, string[]>();

    for (const { from, to } of edges) {
      neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
      neighbors.set(to, [...(neighbors.get(to) ?? []), from]);
    }

    return {
      key: (node) => node,
      neighbors: (node) => neighbors.get(node) ?? [],
      nodes: this.nodes(grid),
    };
  }

  /**
   * Every edge the grid holds, each once, named by the two points it joins.
   *
   * An eastward edge wraps around the grid's own column span and a southward
   * one stops at the last level — see this service's own doc comment for why
   * the two directions differ.
   */
  private edges(grid: MeanderPointGrid): MeanderGridEdge[] {
    const columns = grid[0]?.length ?? 0;
    const edges: MeanderGridEdge[] = [];

    for (const [level, row] of grid.entries()) {
      for (const [column, point] of row.entries()) {
        const from = this.key(level, column);

        if (this.joinsEast(row, point, column)) {
          edges.push({ from, to: this.key(level, (column + 1) % columns) });
        }

        if (this.joinsSouth(grid, level, column)) {
          edges.push({ from, to: this.key(level + 1, column) });
        }
      }
    }

    return edges;
  }

  /** How many of the grid's points are incident to exactly one edge, counting a self-loop's single point as incident twice. */
  private freeEnds(edges: readonly MeanderGridEdge[]): number {
    const incidences = new Map<string, number>();
    const bump = (node: string): void => {
      incidences.set(node, (incidences.get(node) ?? 0) + 1);
    };

    for (const { from, to } of edges) {
      bump(from);
      bump(to);
    }

    return [...incidences.values()].filter((count) => count === 1).length;
  }

  /** Whether the eastward edge leaving `column` is claimed by either of its two ends. */
  private joinsEast(
    row: readonly MeanderPointDirections[],
    point: MeanderPointDirections,
    column: number,
  ): boolean {
    const eastward = row[(column + 1) % row.length];

    return point.east || (eastward?.west ?? false);
  }

  /** Whether the southward edge leaving `(level, column)` is claimed by either of its two ends, reading past the last level as absent. */
  private joinsSouth(
    grid: MeanderPointGrid,
    level: number,
    column: number,
  ): boolean {
    const point = grid[level]?.[column];
    const below = grid[level + 1]?.[column];

    return (
      point !== undefined && below !== undefined && (point.south || below.north)
    );
  }

  /** One point's identity in the graph, which is its position and nothing else. */
  private key(level: number, column: number): string {
    return `${level},${column}`;
  }

  /** Every point of the grid, inked dots included — a point on no edge at all is a component of its own. */
  private nodes(grid: MeanderPointGrid): string[] {
    return grid.flatMap((row, level) =>
      row.map((_point, column) => this.key(level, column)),
    );
  }

  // 🌎 Public Methods

  /**
   * How many pieces one repeat's ink falls into, how many independent loops
   * it closes, and how many of its points terminate.
   *
   * `cycles` is `edges - nodes + components`, the first Betti number — the
   * same arithmetic `InkConnectivity` states as the equality a forest
   * satisfies, reported as a count here because a family is told from another
   * by how many loops it closes rather than only by whether it closes one.
   */
  connectivity(grid: MeanderPointGrid): MeanderConnectivity {
    const edges = this.edges(grid);
    const adjacency = this.adjacency(grid, edges);
    const components = this.meanderTopologyService.components(adjacency);

    return {
      components,
      cycles: edges.length - adjacency.nodes.length + components,
      freeEnds: this.freeEnds(edges),
    };
  }
}
