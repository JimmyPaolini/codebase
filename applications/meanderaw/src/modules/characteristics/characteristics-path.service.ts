import { Injectable } from "@nestjs/common";

import { ConnectivityService } from "./connectivity.service";

import type { Matrix } from "../matrix/matrix.types";

/**
 * Service for analyzing single-arc paths to determine turning and reversing characteristics.
 */
@Injectable()
export class CharacteristicsPathService {
  // 🏗 Dependency Injection
  constructor(
    private readonly meanderConnectivityService: ConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Advances one step along the path and updates tracking state. */
  private advancePath(args: {
    adjacency: Map<string, string[]>;
    columns: number;
    currentNode: string;
    metrics: {
      hasLeftTurn: boolean;
      hasRightTurn: boolean;
      hasTightU: boolean;
    };
    nextNode: string;
    previousDirection: number;
    stepsSinceTurn: number;
    visited: Set<string>;
  }): {
    currentNode: string;
    direction: number;
    nextNode: string | undefined;
    stepsSinceTurn: number;
  } {
    const loopDetected = args.visited.has(args.nextNode);
    args.visited.add(args.nextNode);

    const direction = this.getDirection(
      args.currentNode,
      args.nextNode,
      args.columns,
    );

    const stepsSinceTurn =
      args.previousDirection !== -1 && direction !== -1
        ? this.applyTurn(
            (direction - args.previousDirection + 4) % 4,
            args.metrics,
            args.stepsSinceTurn,
          )
        : args.stepsSinceTurn + 1;

    const previous = args.currentNode;
    const currentNode = args.nextNode;
    const nextNode = loopDetected
      ? undefined
      : this.findNextNode(
          { current: currentNode, previous },
          args.adjacency,
          args.visited,
        );

    return { currentNode, direction, nextNode, stepsSinceTurn };
  }

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

  /** Checks for loop closure turns. */
  private checkFinalLoopTurn(args: {
    currentNode: string;
    initialDirection: number;
    initialNode: string;
    metrics: {
      hasLeftTurn: boolean;
      hasRightTurn: boolean;
      hasTightU: boolean;
    };
    previousDirection: number;
    stepsSinceTurn: number;
  }): void {
    if (
      args.previousDirection !== -1 &&
      args.currentNode === args.initialNode &&
      args.initialDirection !== -1
    ) {
      this.applyTurn(
        (args.initialDirection - args.previousDirection + 4) % 4,
        args.metrics,
        args.stepsSinceTurn,
      );
    }
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

    if (fromPos.row === toPos.row) {
      if (toPos.column === (fromPos.column + 1) % columns) {
        return 1;
      }
      if (fromPos.column === (toPos.column + 1) % columns) {
        return 3;
      }
    }

    if (fromPos.column === toPos.column) {
      if (toPos.row === fromPos.row + 1) {
        return 2;
      }
      if (fromPos.row === toPos.row + 1) {
        return 0;
      }
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

  /** Parses a node string key into column and row integers. */
  private parseKey(key: string): { column: number; row: number } {
    const parts = key.split(",");
    return {
      column: Number.parseInt(parts[1] ?? "0", 10),
      row: Number.parseInt(parts[0] ?? "0", 10),
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

    const initialNode = currentNode;
    let initialDirection = -1;

    while (nextNode) {
      const step = this.advancePath({
        adjacency: args.adjacency,
        columns: args.columns,
        currentNode,
        metrics: args.metrics,
        nextNode,
        previousDirection,
        stepsSinceTurn,
        visited: args.visited,
      });
      if (initialDirection === -1) initialDirection = step.direction;
      previousDirection = step.direction;
      stepsSinceTurn = step.stepsSinceTurn;
      currentNode = step.currentNode;
      nextNode = step.nextNode;
    }

    this.checkFinalLoopTurn({
      currentNode,
      initialDirection,
      initialNode,
      metrics: args.metrics,
      previousDirection,
      stepsSinceTurn,
    });
  }

  // 🌎 Public Methods

  /**
   * Analyzes path directions in a junction-free Matrix to determine turning properties.
   */
  public analyzePaths(matrix: Matrix): {
    reversesAtItsTightestTurn: boolean;
    turnsMonotonically: boolean;
  } {
    const columns = matrix[0]?.length ?? 0;
    if (columns === 0 || matrix.length === 0) {
      return { reversesAtItsTightestTurn: false, turnsMonotonically: false };
    }

    const edges = this.meanderConnectivityService.edges(matrix, false);
    if (edges.length === 0) {
      return { reversesAtItsTightestTurn: false, turnsMonotonically: false };
    }

    const adjacency = this.buildAdjacencyGraph(edges);
    for (const neighbors of adjacency.values()) {
      if (neighbors.length > 2) {
        return { reversesAtItsTightestTurn: false, turnsMonotonically: false };
      }
    }

    return this.tracePaths(adjacency, columns);
  }

  /** Applies a turn to the metrics. */
  public applyTurn(
    turn: number,
    metrics: {
      hasLeftTurn: boolean;
      hasRightTurn: boolean;
      hasTightU: boolean;
    },
    stepsSinceTurn: number,
  ): number {
    if (turn === 0 || turn === 2) return stepsSinceTurn + 1;
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
}
