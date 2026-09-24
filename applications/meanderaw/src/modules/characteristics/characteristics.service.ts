import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { MatrixService } from "../matrix/matrix.service";

import { CharacteristicsFamilyService } from "./characteristics-family.service";
import { CharacteristicsPathService } from "./characteristics-path.service";
import { CharacteristicsShapeService } from "./characteristics-shape.service";
import { ConnectivityService } from "./connectivity.service";

import type { CodeObject } from "../code/code.types";
import type { Directions } from "../tile/tile.types";
import type {
  Characteristics,
  CodeEdge,
  HistogramCounts,
  JunctionCounts,
  MutableHistogram,
} from "./characteristics.types";

/**
 * Computes the raw ink junction counts and boolean Characteristics spec #813
 * asks every meander row to record, directly from a Code,
 * point by point — over the Code `CodeService.parse` already reads, with
 * no SVG and no rendering step anywhere in between.
 *
 * **Ink junctions** need no adjacency lookup: a Code spells all four direction
 * bits out at every point rather than leaving north and west to be derived
 * from a neighbor (see `CodeService`'s own doc comment), so a
 * point's ink degree is simply how many of its own four bits are set.
 *
 * **`hasBranching` and `hasCrossing`** read the ink junction counts.
 *
 * **Components, cycles, and free ends** are delegated whole to
 * `ConnectivityService`, which reads the same Code as a graph rather
 * than point by point.
 */
@Injectable()
export class CharacteristicsService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(CharacteristicsFamilyService)
    private readonly familyService: CharacteristicsFamilyService,
    @Inject(MatrixService)
    private readonly matrixService: MatrixService,
    @Inject(ConnectivityService)
    private readonly meanderConnectivityService: ConnectivityService,
    @Inject(CharacteristicsPathService)
    private readonly pathService: CharacteristicsPathService,
    @Inject(CharacteristicsShapeService)
    private readonly shapeService: CharacteristicsShapeService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Internal helper method. */
  /** Checks if two free ends are adjacent on the lattice (wrapping considered). */
  private checkEndsAreLatticeNeighbors(
    freeEnds: { column: number; row: number }[],
    columns: number,
  ): boolean {
    if (freeEnds.length !== 2) return false;
    const first = freeEnds[0];
    const second = freeEnds[1];
    if (!first || !second) return false;
    const { column: c1, row: r1 } = first;
    const { column: c2, row: r2 } = second;
    const columnDiff = Math.abs(c1 - c2);
    const minimumColumnDiff = Math.min(columnDiff, columns - columnDiff);
    const rowDiff = Math.abs(r1 - r2);
    return minimumColumnDiff + rowDiff === 1;
  }

  /** Internal helper method. */
  /** Counts the T and X junctions for a given set of edges. */
  private countJunctions(edges: CodeEdge[]): {
    tJunctions: number;
    xJunctions: number;
  } {
    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
    }
    let tJunctions = 0;
    let xJunctions = 0;
    for (const d of degree.values()) {
      if (d === 3) tJunctions += 1;
      if (d === 4) xJunctions += 1;
    }
    return { tJunctions, xJunctions };
  }

  /** Internal helper method. */
  /** Finds nodes with exactly one connecting edge. */
  private findFreeEnds(edges: CodeEdge[]): { column: number; row: number }[] {
    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
    }
    const freeEnds: { column: number; row: number }[] = [];
    for (const [node, d] of degree.entries()) {
      if (d === 1) {
        const parts = node.split(",");
        const rowString = parts[0];
        const columnString = parts[1];
        const row = Number(rowString);
        const column = Number(columnString);
        freeEnds.push({
          column: Number.isNaN(column) ? 0 : column,
          row: Number.isNaN(row) ? 0 : row,
        });
      }
    }
    return freeEnds;
  }

  /** How many of a point's four direction bits are set, read directly off the digit rather than derived from a neighbor's edge. */
  private inkDegree(point: Directions): number {
    return [point.east, point.north, point.south, point.west].filter(Boolean)
      .length;
  }

  /** The length of the longest straight horizontal run of ink, wrapping around the columns. */
  private longestHorizontalRun(code: CodeObject): number {
    let maximumRun = 0;

    for (let row = 0; row < code.rows; row += 1) {
      let run = 0;
      let rowMaximum = 0;

      // Scan twice to handle wrap-around
      for (let index = 0; index < code.columns * 2; index += 1) {
        if (
          this.codeService.directionsAt(code, row, index % code.columns).east
        ) {
          run += 1;
          if (run > rowMaximum) rowMaximum = run;
        } else {
          run = 0;
        }
      }

      // Cap at columns, which is the length of a full loop
      if (rowMaximum > code.columns) {
        rowMaximum = code.columns;
      }

      if (rowMaximum > maximumRun) {
        maximumRun = rowMaximum;
      }
    }

    return maximumRun;
  }

  /** The length of the longest straight vertical run of ink. */
  private longestVerticalRun(code: CodeObject): number {
    let maximumRun = 0;

    for (let column = 0; column < code.columns; column += 1) {
      let run = 0;
      let columnMaximum = 0;

      for (let row = 0; row < code.rows; row += 1) {
        if (this.codeService.directionsAt(code, row, column).south) {
          run += 1;
          if (run > columnMaximum) columnMaximum = run;
        } else {
          run = 0;
        }
      }

      if (columnMaximum > maximumRun) {
        maximumRun = columnMaximum;
      }
    }

    return maximumRun;
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

  /** Records counts for a single character to the histogram. */
  private tallyCharacter(character: string, counts: MutableHistogram): void {
    if (character === "0") {
      counts.dotCount += 1;
    } else if (["1", "2", "4", "8"].includes(character)) {
      counts.freeEnds += 1;
      counts.edgeCount += 1;
    } else if (character === "3") {
      counts.horizontalPointCount += 1;
      counts.edgeCount += 2;
    } else if (character === "c" || character === "C") {
      counts.verticalPointCount += 1;
      counts.edgeCount += 2;
    } else if (["5", "6", "9", "a", "A"].includes(character)) {
      counts.cornerCount += 1;
      counts.edgeCount += 2;
    } else if (["7", "b", "B", "d", "D", "e", "E"].includes(character)) {
      counts.tCount += 1;
      counts.edgeCount += 3;
    } else if (character === "f" || character === "F") {
      counts.xCount += 1;
      counts.edgeCount += 4;
    }
  }

  /** The character counts over a Code. */
  private tallyHistogram(code: CodeObject): HistogramCounts {
    const counts: MutableHistogram = {
      cornerCount: 0,
      dotCount: 0,
      edgeCount: 0,
      freeEnds: 0,
      horizontalPointCount: 0,
      tCount: 0,
      verticalPointCount: 0,
      xCount: 0,
    };

    for (const character of code.digits) {
      this.tallyCharacter(character, counts);
    }

    const inkPointCount = code.digits.length - counts.dotCount;
    const edgeCount = counts.edgeCount / 2;
    const density =
      code.rows * code.columns > 0
        ? inkPointCount / (code.rows * code.columns)
        : 0;

    return {
      ...counts,
      density,
      edgeCount,
      hasDots: counts.dotCount > 0,
      hasTJunctions: counts.tCount > 0,
      hasXJunctions: counts.xCount > 0,
      inkPointCount,
      isJunctionFree: counts.tCount === 0 && counts.xCount === 0,
    };
  }

  /** The ink T-junction and X-junction counts over every point the Code spells. */
  private tallyInk(code: CodeObject): JunctionCounts {
    const counts: JunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (let row = 0; row < code.rows; row += 1) {
      for (let column = 0; column < code.columns; column += 1) {
        this.tally(
          counts,
          this.inkDegree(this.codeService.directionsAt(code, row, column)),
        );
      }
    }

    return counts;
  }

  // 🌎 Public Methods

  /** Evaluates formalized family memberships for a Code. */
  public classifyFamilies(code: CodeObject): string[] {
    return this.familyService.classify(code);
  }
  /** Computes every characteristic for a given code. */
  public compute(code: CodeObject): Characteristics {
    const reduced = this.codeService.reduceToUnit(code);
    const ink = this.tallyInk(reduced);

    const wrappedGraph = this.meanderConnectivityService.connectivity(
      reduced,
      false,
    );
    const unwrappedGraph = this.meanderConnectivityService.connectivity(
      reduced,
      true,
    );
    const wrappedEdges = this.meanderConnectivityService.edges(reduced, false);
    const unwrappedEdges = this.meanderConnectivityService.edges(reduced, true);

    const wrappedJunctions = this.countJunctions(wrappedEdges);
    const unwrappedJunctions = this.countJunctions(unwrappedEdges);

    const histogram = this.tallyHistogram(reduced);
    const matrix = this.matrixService.fromCode(reduced);
    const unitShapes = this.shapeService.tallyUnitShapes(matrix);

    const freeEndsList = this.findFreeEnds(wrappedEdges);
    const endsOnBorderRules =
      freeEndsList.length === 2 &&
      freeEndsList.every(
        (end) => end.row === 0 || end.row === reduced.rows - 1,
      );
    const endsAreLatticeNeighbors = this.checkEndsAreLatticeNeighbors(
      freeEndsList,
      reduced.columns,
    );

    const pathProps = histogram.isJunctionFree
      ? this.pathService.analyzePaths(reduced)
      : { reversesAtItsTightestTurn: false, turnsMonotonically: false };

    return {
      ...wrappedGraph,
      ...histogram,
      ...unitShapes,
      componentCount: wrappedGraph.components,
      crossesTheSeam: wrappedEdges.length > unwrappedEdges.length,
      cycleCount: wrappedGraph.cycles,
      endsAreLatticeNeighbors,
      endsOnBorderRules,
      hasBranching: ink.tJunctions > 0,
      hasCrossing: ink.xJunctions > 0,
      inkTJunctions: ink.tJunctions,
      inkXJunctions: ink.xJunctions,
      isClosedLoop:
        wrappedGraph.components === 1 &&
        wrappedGraph.cycles === 1 &&
        wrappedGraph.freeEnds === 0 &&
        histogram.isJunctionFree,
      isConnected: wrappedGraph.components === 1,
      isFlipSymmetric: false,
      isMirrorSymmetric: false,
      isReducible: code.columns > reduced.columns,
      isSingleArc:
        wrappedGraph.components === 1 &&
        wrappedGraph.cycles === 0 &&
        wrappedGraph.freeEnds === 2 &&
        histogram.isJunctionFree,
      longestHorizontalRun: this.longestHorizontalRun(reduced),
      longestVerticalRun: this.longestVerticalRun(reduced),
      pitch: reduced.columns,
      reversesAtItsTightestTurn: pathProps.reversesAtItsTightestTurn,
      seamComponents: unwrappedGraph.components - wrappedGraph.components,
      seamCycles: wrappedGraph.cycles - unwrappedGraph.cycles,
      seamTJunctions:
        wrappedJunctions.tJunctions - unwrappedJunctions.tJunctions,
      seamXJunctions:
        wrappedJunctions.xJunctions - unwrappedJunctions.xJunctions,
      turnsMonotonically: pathProps.turnsMonotonically,
    };
  }

  /** Internal helper method. */
  /** Computes the number of seam components for a given code. */
  public seamComponents(code: CodeObject): number {
    const wrapped = this.meanderConnectivityService.connectivity(code, false);
    const unwrapped = this.meanderConnectivityService.connectivity(code, true);
    return unwrapped.components - wrapped.components;
  }
}
