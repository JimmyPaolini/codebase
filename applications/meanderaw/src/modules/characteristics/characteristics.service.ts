import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";
import { BARE_MATRIX_POINT } from "../matrix/matrix.constants";
import { MatrixService } from "../matrix/matrix.service";

import { CharacteristicsFamilyService } from "./characteristics-family.service";
import { CharacteristicsPathService } from "./characteristics-path.service";
import { CharacteristicsShapeService } from "./characteristics-shape.service";
import { ConnectivityService } from "./connectivity.service";

import type { CodeObject } from "../code/code.types";
import type { Matrix, MatrixPoint } from "../matrix/matrix.types";
import type {
  Characteristics,
  CodeEdge,
  HistogramCounts,
  JunctionCounts,
  MutableHistogram,
} from "./characteristics.types";

/**
 * Computes the raw ink junction counts and boolean Characteristics spec #813
 * asks every meander row to record, directly from a 2D Matrix or Code,
 * point by point — with no SVG and no rendering step anywhere in between.
 *
 * **Ink junctions** need no adjacency lookup: a MatrixPoint spells all four direction
 * bits out at every point, so a point's ink degree is simply how many of its own four bits are set.
 *
 * **`hasBranching` and `hasCrossing`** read the ink junction counts.
 *
 * **Components, cycles, and free ends** are delegated whole to
 * `ConnectivityService`, which reads the Matrix as a graph rather
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

  /** Internal helper method. Checks if two free ends are adjacent on the lattice (wrapping considered). */
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

  /** Computes every characteristic from a 2D Matrix representation. */
  private computeFromMatrix(
    matrix: Matrix,
    isReducible = false,
  ): Characteristics {
    const rows = matrix.length;
    const columns = matrix[0]?.length ?? 0;
    const ink = this.tallyInk(matrix);

    const wrappedGraph = this.meanderConnectivityService.connectivity(
      matrix,
      false,
    );
    const unwrappedGraph = this.meanderConnectivityService.connectivity(
      matrix,
      true,
    );
    const wrappedEdges = this.meanderConnectivityService.edges(matrix, false);
    const unwrappedEdges = this.meanderConnectivityService.edges(matrix, true);

    const wrappedJunctions = this.countJunctions(wrappedEdges);
    const unwrappedJunctions = this.countJunctions(unwrappedEdges);

    const histogram = this.tallyHistogram(matrix);
    const unitShapes = this.shapeService.tallyUnitShapes(matrix);

    const freeEndsList = this.findFreeEnds(wrappedEdges);
    const endsOnBorderRules =
      freeEndsList.length === 2 &&
      freeEndsList.every((end) => end.row === 0 || end.row === rows - 1);
    const endsAreLatticeNeighbors = this.checkEndsAreLatticeNeighbors(
      freeEndsList,
      columns,
    );

    const pathProps = histogram.isJunctionFree
      ? this.pathService.analyzePaths(matrix)
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
      hasArcadePillars: unitShapes.arcadePillarCount > 0,
      hasBranching: ink.tJunctions > 0,
      hasCombSpine: unitShapes.combSpineCount > 0,
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
      isFork:
        wrappedGraph.components === 1 &&
        wrappedGraph.cycles === 0 &&
        ink.tJunctions === 1 &&
        ink.xJunctions === 0 &&
        wrappedGraph.freeEnds === 3 &&
        histogram.dotCount === 0,
      isJunctionFree: histogram.isJunctionFree,
      isMirrorSymmetric: false,
      isPureTree:
        wrappedGraph.components === 1 &&
        wrappedGraph.cycles === 0 &&
        ink.tJunctions >= 2 &&
        ink.xJunctions === 0 &&
        histogram.dotCount === 0,
      isReducible,
      isSingleArc:
        wrappedGraph.components === 1 &&
        wrappedGraph.cycles === 0 &&
        wrappedGraph.freeEnds === 2 &&
        histogram.isJunctionFree,
      isStippled:
        wrappedGraph.components > 1 &&
        histogram.dotCount > 0 &&
        ink.tJunctions > 0,
      longestHorizontalRun: this.longestHorizontalRun(matrix),
      longestVerticalRun: this.longestVerticalRun(matrix),
      pitch: columns,
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

  /** Internal helper method. Counts the T and X junctions for a given set of edges. */
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

  /** Internal helper method. Finds nodes with exactly one connecting edge. */
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
  private inkDegree(point: MatrixPoint): number {
    return [point.east, point.north, point.south, point.west].filter(Boolean)
      .length;
  }

  /** The length of the longest straight vertical run of ink in a column. */
  private longestColumnRun(matrix: Matrix, column: number): number {
    let run = 0;
    let maximum = 0;

    for (const row of matrix) {
      const point = row[column] ?? BARE_MATRIX_POINT;
      if (point.south) {
        run += 1;
        if (run > maximum) maximum = run;
      } else {
        run = 0;
      }
    }

    return maximum;
  }

  /** The length of the longest straight horizontal run of ink, wrapping around the columns. */
  private longestHorizontalRun(matrix: Matrix): number {
    const columns = matrix[0]?.length ?? 0;
    if (matrix.length === 0 || columns === 0) return 0;

    return Math.max(...matrix.map((row) => this.longestRowRun(row, columns)));
  }

  /** The length of the longest straight horizontal run of ink in a row, wrapping around columns. */
  private longestRowRun(
    rowPoints: readonly MatrixPoint[],
    columns: number,
  ): number {
    let run = 0;
    let maximum = 0;

    for (let index = 0; index < columns * 2; index += 1) {
      const point = rowPoints[index % columns] ?? BARE_MATRIX_POINT;
      if (point.east) {
        run += 1;
        if (run > maximum) maximum = run;
      } else {
        run = 0;
      }
    }

    return Math.min(maximum, columns);
  }

  /** The length of the longest straight vertical run of ink. */
  private longestVerticalRun(matrix: Matrix): number {
    const columns = matrix[0]?.length ?? 0;
    if (matrix.length === 0 || columns === 0) return 0;

    return Math.max(
      ...Array.from({ length: columns }, (_unused, column) =>
        this.longestColumnRun(matrix, column),
      ),
    );
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

  /** Records counts for a degree-2 point (straight line or corner). */
  private tallyDegreeTwoPoint(
    point: MatrixPoint,
    counts: MutableHistogram,
  ): void {
    counts.edgeCount += 2;
    if (point.east && point.west) {
      counts.horizontalPointCount += 1;
    } else if (point.north && point.south) {
      counts.verticalPointCount += 1;
    } else {
      counts.cornerCount += 1;
    }
  }

  /** The character counts over a Matrix. */
  private tallyHistogram(matrix: Matrix): HistogramCounts {
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

    for (const row of matrix) {
      for (const point of row) {
        this.tallyMatrixPoint(point, counts);
      }
    }

    const rows = matrix.length;
    const columns = matrix[0]?.length ?? 0;
    const totalPoints = rows * columns;
    const inkPointCount = totalPoints - counts.dotCount;
    const edgeCount = counts.edgeCount / 2;
    const density = totalPoints > 0 ? inkPointCount / totalPoints : 0;

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

  /** The ink T-junction and X-junction counts over every point the Matrix spells. */
  private tallyInk(matrix: Matrix): JunctionCounts {
    const counts: JunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (const row of matrix) {
      for (const point of row) {
        this.tally(counts, this.inkDegree(point));
      }
    }

    return counts;
  }

  /** Records counts for a single matrix point to the histogram. */
  private tallyMatrixPoint(point: MatrixPoint, counts: MutableHistogram): void {
    const degree = this.inkDegree(point);
    switch (degree) {
      case 0: {
        counts.dotCount += 1;
        break;
      }
      case 1: {
        counts.freeEnds += 1;
        counts.edgeCount += 1;
        break;
      }
      case 2: {
        this.tallyDegreeTwoPoint(point, counts);
        break;
      }
      case 3: {
        counts.tCount += 1;
        counts.edgeCount += 3;
        break;
      }
      case 4: {
        counts.xCount += 1;
        counts.edgeCount += 4;
        break;
      }
    }
  }

  // 🌎 Public Methods

  /** Evaluates formalized family memberships for a Code. */
  public classifyFamilies(code: CodeObject): string[] {
    return this.familyService.classify(code);
  }

  /** Computes every characteristic for a given parsed code (delegates to measure). */
  public compute(code: CodeObject): Characteristics {
    return this.measure(code);
  }

  /** Computes every characteristic for a given Matrix, CodeObject, or code string. */
  public measure(
    input: CodeObject | Matrix | string,
    rows?: number,
    columns?: number,
  ): Characteristics {
    if (typeof input === "string") {
      const parsed = this.codeService.parse(input, rows, columns);
      const reduced = this.codeService.reduceToUnit(parsed);
      const matrix = this.matrixService.fromCode(reduced);
      return this.computeFromMatrix(matrix, parsed.columns > reduced.columns);
    }

    if ("digits" in input) {
      const reduced = this.codeService.reduceToUnit(input);
      const matrix = this.matrixService.fromCode(reduced);
      return this.computeFromMatrix(matrix, input.columns > reduced.columns);
    }

    return this.computeFromMatrix(input, false);
  }

  /** Computes the number of seam components for a given Matrix, CodeObject, or code string. */
  public seamComponents(code: CodeObject | Matrix | string): number {
    let matrix: Matrix;
    if (typeof code === "string") {
      matrix = this.matrixService.fromCode(this.codeService.parse(code));
    } else if ("digits" in code) {
      matrix = this.matrixService.fromCode(code);
    } else {
      matrix = code;
    }

    const wrapped = this.meanderConnectivityService.connectivity(matrix, false);
    const unwrapped = this.meanderConnectivityService.connectivity(
      matrix,
      true,
    );
    return unwrapped.components - wrapped.components;
  }
}
