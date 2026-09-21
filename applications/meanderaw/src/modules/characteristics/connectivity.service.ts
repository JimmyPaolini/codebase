import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { GraphService } from "../graph/graph.service";

import type { CodeService as ICodeService } from "../code/code.service";
import type { ParsedCode } from "../code/code.types";
import type { InkAdjacency } from "../graph/graph.types";
import type { CodeEdge, Connectivity } from "./characteristics.types";

/**
 * Reads a Code as a graph, and reports the three numbers no
 * charter invariant fixes: how many pieces the ink falls into, how many
 * loops it closes, and how many of its points terminate.
 *
 * They are read off the Code directly, for the same reason
 * `CharacteristicsService` reads the junction counts off it: a Code is what
 * a meander is, and measuring it should not require rendering it first, nor
 * building a grid to walk.
 *
 * **A Code is read as one repeat of a band, not as a finished drawing.** A
 * step east off the last column arrives at the first column of the same
 * Code, because that wrap is what makes a repeat unit join up with its own
 * next repeat. North and south do not wrap: the Code's first and last levels
 * sit against the band's two border rules, which are cap ticks rather than
 * points of the repeat. The consequence is worth stating:
 * a run that closes only by wrapping — every level leaving its own point
 * east and arriving back at it from the west — is a loop here and a straight
 * rule in the drawing.
 *
 * **An edge is claimed by either of its ends.** A Code spells all four bits
 * out per point and `CodeService.parse` validates only the alphabet, so a
 * Code may name an eastward edge at one point without the point it reaches
 * naming the matching westward one. Following only a point's own bits would
 * make the walk's answer depend on the order the Code is read in, which is
 * no property of the ink at all — so an edge is present when either end
 * claims it, and the graph is symmetric by construction whatever the Code
 * says. For a Code spelled from a well-formed tile the two readings agree,
 * since every edge there is written at both of its ends.
 *
 * A **self-loop** — a single-column Code's eastward edge, which leaves its
 * point and arrives back at it — is one edge incident to its point twice.
 * That is what keeps `cycles` reporting it as the loop it is, and what keeps
 * it out of `freeEnds`: the ink really does leave that point both ways,
 * running off one side of the repeat and back in the other, so nothing
 * terminates there.
 */
@Injectable()
export class ConnectivityService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: ICodeService,
    @Inject(GraphService)
    private readonly graphService: GraphService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The Code's edges as an {@link InkAdjacency}, which is all {@link GraphService.components} needs of it. */
  private adjacency(
    code: ParsedCode,
    edges: readonly CodeEdge[],
  ): InkAdjacency<string> {
    const neighbors = new Map<string, string[]>();

    for (const { from, to } of edges) {
      neighbors.set(from, [...(neighbors.get(from) ?? []), to]);
      neighbors.set(to, [...(neighbors.get(to) ?? []), from]);
    }

    return {
      key: (node) => node,
      neighbors: (node) => neighbors.get(node) ?? [],
      nodes: this.nodes(code),
    };
  }

  /** How many of the Code's points are incident to exactly one edge, counting a self-loop's single point as incident twice. */
  private freeEnds(edges: readonly CodeEdge[]): number {
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

  /** Whether the southward edge leaving `(level, column)` is claimed by either of its two ends, reading past the last level as absent. */
  private joinsSouth(code: ParsedCode, level: number, column: number): boolean {
    if (level + 1 >= code.levels) {
      return false;
    }

    const point = this.codeService.directionsAt(code, level, column);
    const below = this.codeService.directionsAt(code, level + 1, column);

    return point.south || below.north;
  }

  /** One point's identity in the graph, which is its position and nothing else. */
  private key(level: number, column: number): string {
    return `${level},${column}`;
  }

  /** Every point the Code spells, inked dots included — a point on no edge at all is a component of its own. */
  private nodes(code: ParsedCode): string[] {
    return Array.from({ length: code.levels }, (_unused, level) =>
      Array.from({ length: code.columns }, (_column, column) =>
        this.key(level, column),
      ),
    ).flat();
  }

  /**
   * How many pieces one repeat's ink falls into, how many independent loops
   * it closes, and how many of its points terminate.
   *
   * `cycles` is `edges - nodes + components`, the first Betti number — the
   * same arithmetic `InkConnectivity` states as the equality a forest
   * satisfies, reported as a count here because a family is told from another
   * by how many loops it closes rather than only by whether it closes one.
   */
  connectivity(code: ParsedCode, unwrapped = false): Connectivity {
    const edges = this.edges(code, unwrapped);
    const adjacency = this.adjacency(code, edges);
    const components = this.graphService.components(adjacency);

    return {
      components,
      cycles: edges.length - adjacency.nodes.length + components,
      freeEnds: this.freeEnds(edges),
    };
  }

  /**
   * Every edge the Code holds, each once, named by the two points it joins.
   *
   * An eastward edge wraps around the Code's own column span and a southward
   * one stops at the last level — see this service's own doc comment for why
   * the two directions differ.
   */
  edges(code: ParsedCode, unwrapped: boolean): CodeEdge[] {
    const { columns, levels } = code;
    const edges: CodeEdge[] = [];

    for (let level = 0; level < levels; level += 1) {
      for (let column = 0; column < columns; column += 1) {
        const from = this.key(level, column);

        if (
          this.joinsEast(code, level, column) &&
          (!unwrapped || column !== columns - 1)
        ) {
          edges.push({ from, to: this.key(level, (column + 1) % columns) });
        }

        if (this.joinsSouth(code, level, column)) {
          edges.push({ from, to: this.key(level + 1, column) });
        }
      }
    }

    return edges;
  }

  // 🌎 Public Methods

  /** Whether the eastward edge leaving `column` is claimed by either of its two ends. */
  joinsEast(code: ParsedCode, level: number, column: number): boolean {
    const point = this.codeService.directionsAt(code, level, column);
    const eastward = this.codeService.directionsAt(
      code,
      level,
      (column + 1) % code.columns,
    );

    return point.east || eastward.west;
  }
}
