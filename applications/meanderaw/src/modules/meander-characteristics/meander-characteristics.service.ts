import { Injectable } from "@nestjs/common";

import type {
  MeanderPointDirections,
  MeanderPointGrid,
} from "../meander-decoding/meander-decoding.types";
import type {
  MeanderCharacteristics,
  MeanderJunctionCounts,
} from "./meander-characteristics.types";

/**
 * Computes the raw junction counts and boolean Characteristics spec #813
 * asks every meander row to record, directly from a decoded Code's
 * per-point direction-bit grid — generalizing `MeanderTopologyService`'s
 * approach (which reads the same two kinds of junction off a *rendered* SVG
 * document, by rebuilding a lattice from its path data) to the grid
 * `MeanderDecodingService.decode` already produces, with no SVG and no
 * rendering step anywhere in between.
 *
 * **Ink junctions** need no adjacency lookup the way
 * `MeanderTopologyService.inkDegree` does: a Code spells all four direction
 * bits out at every point rather than leaving north and west to be derived
 * from a neighbor (see `MeanderDecodingService`'s own doc comment), so a
 * point's ink degree is simply how many of its own four bits are set.
 *
 * **Negative (white-space) junctions** are still counted over the dual grid
 * of cells, the same shape `MeanderTopologyService.negativeDegree` counts —
 * a cell bounded by four lattice points has a corridor to a neighboring cell
 * wherever the ink edge between them is absent — but bounded by the decoded
 * grid's own extent rather than a rendered canvas's: a cell on the grid's
 * own edge has fewer than four possible corridors, the same edge-cropping
 * `negativeDegree` applies, just relative to where the Code itself stops
 * rather than to a border rule a renderer draws beyond it.
 *
 * **`hasBranching` and `hasCrossing`** read *both* counts rather than the
 * ink count alone. Ink-only would read `false` across the whole historical
 * corpus: `MeanderTopologyService`'s own doc comment records that a
 * finished drawing never actually violates the charter's no-branching and
 * no-crossing invariants in its ink — two sub-families of `mosaic` "cross"
 * only in the negative space, and nowhere else — so a Characteristic meant
 * to flag that structure has to look at both.
 */
@Injectable()
export class MeanderCharacteristicsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether the cell at `(level, column)` has an open corridor east, into `(level, column + 1)`. */
  private hasEastCorridor(
    grid: MeanderPointGrid,
    level: number,
    column: number,
  ): boolean {
    const cellColumns = (grid[0]?.length ?? 0) - 1;

    return (
      column < cellColumns - 1 && !this.pointAt(grid, level, column + 1)?.south
    );
  }

  /** Whether the cell at `(level, column)` has an open corridor north, into `(level - 1, column)`. */
  private hasNorthCorridor(
    grid: MeanderPointGrid,
    level: number,
    column: number,
  ): boolean {
    return level > 0 && !this.pointAt(grid, level, column)?.east;
  }

  /** Whether the cell at `(level, column)` has an open corridor south, into `(level + 1, column)`. */
  private hasSouthCorridor(
    grid: MeanderPointGrid,
    level: number,
    column: number,
  ): boolean {
    const cellRows = grid.length - 1;

    return level < cellRows - 1 && !this.pointAt(grid, level + 1, column)?.east;
  }

  /** Whether the cell at `(level, column)` has an open corridor west, into `(level, column - 1)`. */
  private hasWestCorridor(
    grid: MeanderPointGrid,
    level: number,
    column: number,
  ): boolean {
    return column > 0 && !this.pointAt(grid, level, column)?.south;
  }

  /** How many of a point's four direction bits are set, read directly off the digit rather than derived from a neighbor's edge. */
  private inkDegree(point: MeanderPointDirections): number {
    return [point.east, point.north, point.south, point.west].filter(Boolean)
      .length;
  }

  /**
   * How many of a cell's up to four corridors to a neighboring cell are
   * open, where the cell bounded by grid points `(level, column)`,
   * `(level, column + 1)`, `(level + 1, column)`, and
   * `(level + 1, column + 1)` is bounded rather than crossing off the
   * decoded grid's own extent — the equivalent of
   * `MeanderTopologyService.negativeDegree`'s own canvas-edge cropping.
   */
  private negativeDegree(
    grid: MeanderPointGrid,
    level: number,
    column: number,
  ): number {
    return [
      this.hasEastCorridor(grid, level, column),
      this.hasNorthCorridor(grid, level, column),
      this.hasSouthCorridor(grid, level, column),
      this.hasWestCorridor(grid, level, column),
    ].filter(Boolean).length;
  }

  /** One grid point, or `undefined` off the grid's own extent. */
  private pointAt(
    grid: MeanderPointGrid,
    level: number,
    column: number,
  ): MeanderPointDirections | undefined {
    return grid[level]?.[column];
  }

  /** Records one degree as a three-armed junction, a four-armed one, or neither. */
  private tally(counts: MeanderJunctionCounts, degree: number): void {
    if (degree === 3) {
      counts.tJunctions += 1;
    }

    if (degree === 4) {
      counts.xJunctions += 1;
    }
  }

  /** The ink T-junction and X-junction counts over every point of the decoded grid. */
  private tallyInk(grid: MeanderPointGrid): MeanderJunctionCounts {
    const counts: MeanderJunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (const row of grid) {
      for (const point of row) {
        this.tally(counts, this.inkDegree(point));
      }
    }

    return counts;
  }

  /** The negative T-junction and X-junction counts over every cell of the grid's dual. */
  private tallyNegative(grid: MeanderPointGrid): MeanderJunctionCounts {
    const cellRows = grid.length - 1;
    const cellColumns = (grid[0]?.length ?? 0) - 1;
    const counts: MeanderJunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (let level = 0; level < cellRows; level += 1) {
      for (let column = 0; column < cellColumns; column += 1) {
        this.tally(counts, this.negativeDegree(grid, level, column));
      }
    }

    return counts;
  }

  // 🌎 Public Methods

  /**
   * Computes every raw junction count and boolean Characteristic a decoded
   * Code's grid carries.
   */
  compute(grid: MeanderPointGrid): MeanderCharacteristics {
    const ink = this.tallyInk(grid);
    const negative = this.tallyNegative(grid);

    return {
      hasBranching: ink.tJunctions > 0 || negative.tJunctions > 0,
      hasCrossing: ink.xJunctions > 0 || negative.xJunctions > 0,
      inkTJunctions: ink.tJunctions,
      inkXJunctions: ink.xJunctions,
      negativeTJunctions: negative.tJunctions,
      negativeXJunctions: negative.xJunctions,
    };
  }
}
