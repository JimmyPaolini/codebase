// cspell:ignore Neighbours

import {
  forwardRef as forwardReference,
  Inject,
  Injectable,
} from "@nestjs/common";

import { CodeService } from "../code/code.service";

import { CharacteristicsPathService } from "./characteristics-path.service";
import { CharacteristicsShapeService } from "./characteristics-shape.service";
import { ConnectivityService } from "./connectivity.service";

import type { CodeService as ICodeService } from "../code/code.service";
import type { ParsedCode } from "../code/code.types";
import type { Directions } from "../tile/tile.types";
import type {
  Characteristics,
  CodeEdge,
  HistogramCounts,
  JunctionCounts,
  MutableHistogram,
} from "./characteristics.types";

/** * Computes the raw junction counts and boolean Characteristics spec #813
 * asks every meander row to record, directly from a Code,
 * point by point — over the Code `CodeService.parse` already reads, with
 * no SVG and no rendering step anywhere in between. A retired reader did
 * the same two counts off a *rendered* SVG document, by rebuilding a
 * lattice from its path data; nothing reads a drawing now.
 * **Ink junctions** need no adjacency lookup: a Code spells all four direction
 * bits out at every point rather than leaving north and west to be derived
 * from a neighbor (see `CodeService`'s own doc comment), so a
 * point's ink degree is simply how many of its own four bits are set.
 * **Negative (white-space) junctions** are still counted over the dual grid
 * of cells — a cell bounded by four lattice points has a corridor to a neighboring cell
 * wherever the ink edge between them is absent — but bounded by the Code's
 * own extent rather than a rendered canvas's: a cell on the Code's
 * own edge has fewer than four possible corridors, cropped relative to
 * where the Code itself stops rather than to a border rule a renderer draws
 * beyond it.
 * **`hasBranching` and `hasCrossing`** read *both* counts rather than the
 * ink count alone. Ink-only would read `false` across the whole historical
 * corpus, because a finished drawing never actually violates the charter's no-branching and
 * no-crossing invariants in its ink — two sub-families of `mosaic` "cross"
 * only in the negative space, and nowhere else — so a Characteristic meant
 * to flag that structure has to look at both.
 * **Components, cycles, and free ends** are delegated whole to
 * `ConnectivityService`, which reads the same Code as a graph rather
 * than point by point. They are Characteristics for the same reason the
 * junction counts are: no charter invariant fixes them, and they are what
 * tells one family's structure from another's where the junction counts
 * agree. Measured over the committed corpus, a `snake` repeat is one piece
 * closing one loop with nothing terminating, a `boxes` repeat one piece
 * closing none with two ends, and a `parallel` repeat one piece per strand
 * plus one, each with two ends — three readings the junction counts call
 * identically and this one separates. `ClassificationService` is
 * where that separation is written down.
 */
@Injectable()
export class CharacteristicsService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(forwardReference(() => CodeService))
    private readonly codeService: ICodeService,
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
  private checkEndsAreLatticeNeighbours(
    freeEnds: { column: number; level: number }[],
    columns: number,
  ): boolean {
    if (freeEnds.length !== 2) return false;
    const first = freeEnds[0];
    const second = freeEnds[1];
    if (!first || !second) return false;
    const { column: c1, level: l1 } = first;
    const { column: c2, level: l2 } = second;
    const columnDiff = Math.abs(c1 - c2);
    const minimumColumnDiff = Math.min(columnDiff, columns - columnDiff);
    const levelDiff = Math.abs(l1 - l2);
    return minimumColumnDiff + levelDiff === 1;
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
  private findFreeEnds(edges: CodeEdge[]): { column: number; level: number }[] {
    const degree = new Map<string, number>();
    for (const edge of edges) {
      degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
    }
    const freeEnds: { column: number; level: number }[] = [];
    for (const [node, d] of degree.entries()) {
      if (d === 1) {
        const [level, column] = node.split(",").map(Number);
        freeEnds.push({ column: column ?? 0, level: level ?? 0 });
      }
    }
    return freeEnds;
  }

  /** Whether the cell at `(level, column)` has an open corridor east, into `(level, column + 1)`. */
  private hasEastCorridor(
    code: ParsedCode,
    level: number,
    column: number,
  ): boolean {
    const cellColumns = code.columns - 1;

    return (
      column < cellColumns - 1 &&
      !this.codeService.directionsAt(code, level, column + 1).south
    );
  }

  /** Whether the cell at `(level, column)` has an open corridor north, into `(level - 1, column)`. */
  private hasNorthCorridor(
    code: ParsedCode,
    level: number,
    column: number,
  ): boolean {
    return (
      level > 0 && !this.codeService.directionsAt(code, level, column).east
    );
  }

  /** Whether the cell at `(level, column)` has an open corridor south, into `(level + 1, column)`. */
  private hasSouthCorridor(
    code: ParsedCode,
    level: number,
    column: number,
  ): boolean {
    const cellRows = code.levels - 1;

    return (
      level < cellRows - 1 &&
      !this.codeService.directionsAt(code, level + 1, column).east
    );
  }

  /** Whether the cell at `(level, column)` has an open corridor west, into `(level, column - 1)`. */
  private hasWestCorridor(
    code: ParsedCode,
    level: number,
    column: number,
  ): boolean {
    return (
      column > 0 && !this.codeService.directionsAt(code, level, column).south
    );
  }

  /** How many of a point's four direction bits are set, read directly off the digit rather than derived from a neighbor's edge. */
  private inkDegree(point: Directions): number {
    return [point.east, point.north, point.south, point.west].filter(Boolean)
      .length;
  }

  /** The length of the longest straight horizontal run of ink, wrapping around the columns. */
  private longestHorizontalRun(code: ParsedCode): number {
    let maximumRun = 0;

    for (let level = 0; level < code.levels; level += 1) {
      let run = 0;
      let rowMaximum = 0;

      // Scan twice to handle wrap-around
      for (let index = 0; index < code.columns * 2; index += 1) {
        if (
          this.codeService.directionsAt(code, level, index % code.columns).east
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
  private longestVerticalRun(code: ParsedCode): number {
    let maximumRun = 0;

    for (let column = 0; column < code.columns; column += 1) {
      let run = 0;
      let columnMaximum = 0;

      for (let level = 0; level < code.levels; level += 1) {
        if (this.codeService.directionsAt(code, level, column).south) {
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

  /**
   * How many of a cell's up to four corridors to a neighboring cell are
   * open, where the cell bounded by grid points `(level, column)`,
   * `(level, column + 1)`, `(level + 1, column)`, and
   * `(level + 1, column + 1)` is bounded rather than crossing off the
   * Code's own extent, which is where a rendered canvas's edge used to be
   * read off instead.
   */
  private negativeDegree(
    code: ParsedCode,
    level: number,
    column: number,
  ): number {
    return [
      this.hasEastCorridor(code, level, column),
      this.hasNorthCorridor(code, level, column),
      this.hasSouthCorridor(code, level, column),
      this.hasWestCorridor(code, level, column),
    ].filter(Boolean).length;
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

  // 🌎 Public Methods

  /** Computes every raw junction count and boolean Characteristic a Code carries. */

  /** The character counts over a Code. */
  private tallyHistogram(code: ParsedCode): HistogramCounts {
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
      code.levels * code.columns > 0
        ? inkPointCount / (code.levels * code.columns)
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
  private tallyInk(code: ParsedCode): JunctionCounts {
    const counts: JunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (let level = 0; level < code.levels; level += 1) {
      for (let column = 0; column < code.columns; column += 1) {
        this.tally(
          counts,
          this.inkDegree(this.codeService.directionsAt(code, level, column)),
        );
      }
    }

    return counts;
  }

  /** The negative T-junction and X-junction counts over every cell of the lattice's dual. */
  private tallyNegative(code: ParsedCode): JunctionCounts {
    const cellRows = code.levels - 1;
    const cellColumns = code.columns - 1;
    const counts: JunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (let level = 0; level < cellRows; level += 1) {
      for (let column = 0; column < cellColumns; column += 1) {
        this.tally(counts, this.negativeDegree(code, level, column));
      }
    }

    return counts;
  }

  /** Computes every characteristic for a given code. */
  public compute(code: ParsedCode): Characteristics {
    const reduced = this.codeService.reduceToUnit(code);
    const ink = this.tallyInk(reduced);
    const negative = this.tallyNegative(reduced);

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
    const unitShapes = this.shapeService.tallyUnitShapes(reduced);

    const freeEndsList = this.findFreeEnds(wrappedEdges);
    const endsOnBorderRules =
      freeEndsList.length === 2 &&
      freeEndsList.every(
        (end) => end.level === 0 || end.level === reduced.levels - 1,
      );
    const endsAreLatticeNeighbours = this.checkEndsAreLatticeNeighbours(
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
      endsAreLatticeNeighbours,
      endsOnBorderRules,
      hasBranching: ink.tJunctions > 0 || negative.tJunctions > 0,
      hasCrossing: ink.xJunctions > 0 || negative.xJunctions > 0,
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
      negativeTJunctions: negative.tJunctions,
      negativeXJunctions: negative.xJunctions,
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
  public seamComponents(code: ParsedCode): number {
    const wrapped = this.meanderConnectivityService.connectivity(code, false);
    const unwrapped = this.meanderConnectivityService.connectivity(code, true);
    return unwrapped.components - wrapped.components;
  }
}
