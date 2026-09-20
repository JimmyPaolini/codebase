import { Injectable } from "@nestjs/common";

import { ConnectivityService } from "./connectivity.service";

import type { ParsedCode } from "../code/code.types";

/**
 * Service for analyzing single-arc paths to determine turning and reversing characteristics.
 */
@Injectable()
export class CharacteristicsPathService {
  // 🏗 Dependency Injection
  constructor(
    private readonly meanderConnectivityService: ConnectivityService,
  ) {}

  /** Applies a turn to the metrics. */
  private applyTurn(
    turn: number,
    metrics: {
      hasLeftTurn: boolean;
      hasRightTurn: boolean;
      hasTightU: boolean;
    },
    stepsSinceTurn: number,
  ): number {
    if (turn === 0) return stepsSinceTurn + 1;
    if (turn === 1) {
      metrics.hasRightTurn = true;
      if (stepsSinceTurn === 1) metrics.hasTightU = true;
      return 0;
    }
    if (turn === 3) {
      metrics.hasLeftTurn = true;
      if (stepsSinceTurn === 1) metrics.hasTightU = true;
      return 0;
    }
    return stepsSinceTurn;
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds an adjacency list from the given edges. */
  private buildAdjacencyGraph(
    edges: { from: string; to: string }[],
  ): Map<string, string[]> {
    const adjacency = new Map<string, string[]>();
    for (const { from, to } of edges) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      if (!adjacency.has(to)) adjacency.set(to, []);
      adjacency.get(from)?.push(to);
      adjacency.get(to)?.push(from);
    }
    return adjacency;
  }

  /** Finds the next node in the path. */
  private findNextNode(
    nodes: { current: string; previous: string | undefined },
    adjacency: Map<string, string[]>,
    visited: Set<string>,
  ): string | undefined {
    const neighbors = this.getNeighbors(nodes.current, adjacency);
    const unvisited = neighbors.find((n) => !visited.has(n));
    if (unvisited) return unvisited;
    if (neighbors.length === 2 && nodes.previous !== undefined) {
      return neighbors.find((n) => n !== nodes.previous);
    }
    return undefined;
  }

  /** Finds a suitable start node, preferring one with degree 1 if available in the same component. */
  private findStartNode(
    startNode: string,
    adjacency: Map<string, string[]>,
  ): string {
    const startNeighbors = this.getNeighbors(startNode, adjacency);
    if (startNeighbors.length !== 2) return startNode;

    const queue = [startNode];
    const visited = new Set<string>([startNode]);

    for (const node of queue) {
      const neighbors = this.getNeighbors(node, adjacency);
      if (neighbors.length === 1) return node;

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return startNode;
  }

  /** Returns 0=Up, 1=Right, 2=Down, 3=Left or -1 if invalid. */
  private getDirection(from: string, to: string, columns: number): number {
    const fromPos = this.parseKey(from);
    const toPos = this.parseKey(to);

    if (fromPos.level === toPos.level) {
      if (toPos.column === (fromPos.column + 1) % columns) return 1;
      if (fromPos.column === (toPos.column + 1) % columns) return 3;
    }
    if (fromPos.column === toPos.column) {
      if (toPos.level === fromPos.level + 1) return 2;
      if (fromPos.level === toPos.level + 1) return 0;
    }
    return -1;
  }

  /** Gets neighbors of a node. */
  private getNeighbors(
    node: string,
    adjacency: Map<string, string[]>,
  ): string[] {
    return adjacency.get(node) ?? [];
  }

  /** Parses a node string key into column and level integers. */
  private parseKey(key: string): { column: number; level: number } {
    const parts = key.split(",");
    return {
      column: Number.parseInt(parts[1] ?? "0", 10),
      level: Number.parseInt(parts[0] ?? "0", 10),
    };
  }

  /** Traces all disjoint paths in the adjacency graph to compute turn behaviors. */
  private tracePaths(
    adjacency: Map<string, string[]>,
    columns: number,
  ): {
    reversesAtItsTightestTurn: boolean;
    turnsMonotonically: boolean;
  } {
    const visited = new Set<string>();
    const metrics = {
      hasLeftTurn: false,
      hasRightTurn: false,
      hasTightU: false,
    };

    for (const startNode of adjacency.keys()) {
      if (!visited.has(startNode)) {
        this.traceSinglePath({
          adjacency,
          columns,
          metrics,
          startNode,
          visited,
        });
      }
    }

    const turnsMonotonically =
      (metrics.hasLeftTurn && !metrics.hasRightTurn) ||
      (metrics.hasRightTurn && !metrics.hasLeftTurn);

    return { reversesAtItsTightestTurn: metrics.hasTightU, turnsMonotonically };
  }

  /** Traces a single path starting from a node. */
  private traceSinglePath(args: {
    adjacency: Map<string, string[]>;
    columns: number;
    metrics: {
      hasLeftTurn: boolean;
      hasRightTurn: boolean;
      hasTightU: boolean;
    };
    startNode: string;
    visited: Set<string>;
  }): void {
    let currentNode = this.findStartNode(args.startNode, args.adjacency);
    args.visited.add(currentNode);

    let previousDirection = -1;
    let stepsSinceTurn = 0;
    let nextNode = this.findNextNode(
      { current: currentNode, previous: undefined },
      args.adjacency,
      args.visited,
    );

    while (nextNode) {
      const isLoop = args.visited.has(nextNode);
      args.visited.add(nextNode);

      const dir = this.getDirection(currentNode, nextNode, args.columns);
      stepsSinceTurn =
        previousDirection !== -1 && dir !== -1
          ? this.applyTurn(
              (dir - previousDirection + 4) % 4,
              args.metrics,
              stepsSinceTurn,
            )
          : stepsSinceTurn + 1;

      previousDirection = dir;
      const prev = currentNode;
      currentNode = nextNode;
      nextNode = isLoop
        ? undefined
        : this.findNextNode(
            { current: currentNode, previous: prev },
            args.adjacency,
            args.visited,
          );
    }
  }

  // 🌎 Public Methods

  /**
   * Analyzes path directions in a junction-free code to determine turning properties.
   */
  public analyzePaths(code: ParsedCode): {
    reversesAtItsTightestTurn: boolean;
    turnsMonotonically: boolean;
  } {
    const edges = this.meanderConnectivityService.edges(code, false);
    if (edges.length === 0) {
      return { reversesAtItsTightestTurn: false, turnsMonotonically: false };
    }

    const adjacency = this.buildAdjacencyGraph(edges);
    for (const neighbors of adjacency.values()) {
      if (neighbors.length > 2) {
        return { reversesAtItsTightestTurn: false, turnsMonotonically: false };
      }
    }

    return this.tracePaths(adjacency, code.columns);
  }
}
