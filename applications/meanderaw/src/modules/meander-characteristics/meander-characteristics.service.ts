import { Inject, Injectable } from "@nestjs/common";

import { CodeService } from "../code/code.service";

import { MeanderConnectivityService } from "./meander-connectivity.service";

import type { ParsedCode } from "../code/code.types";
import type { MosaicDirections } from "../mosaic-tile/mosaic-tile.types";
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
 *
 * **Components, cycles, and free ends** are delegated whole to
 * `MeanderConnectivityService`, which reads the same grid as a graph rather
 * than point by point. They are Characteristics for the same reason the
 * junction counts are: no charter invariant fixes them, and they are what
 * tells one family's structure from another's where the junction counts
 * agree. Measured over the committed corpus, a `snake` repeat is one piece
 * closing one loop with nothing terminating, a `boxes` repeat one piece
 * closing none with two ends, and a `parallel` repeat one piece per strand
 * plus one, each with two ends — three readings the junction counts call
 * identically and this one separates. `MeanderClassificationService` is
 * where that separation is written down.
 */
@Injectable()
export class MeanderCharacteristicsService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(CodeService)
    private readonly codeService: CodeService,
    @Inject(MeanderConnectivityService)
    private readonly meanderConnectivityService: MeanderConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

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
  private inkDegree(point: MosaicDirections): number {
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
  private tally(counts: MeanderJunctionCounts, degree: number): void {
    if (degree === 3) {
      counts.tJunctions += 1;
    }

    if (degree === 4) {
      counts.xJunctions += 1;
    }
  }

  /** The ink T-junction and X-junction counts over every point the Code spells. */
  private tallyInk(code: ParsedCode): MeanderJunctionCounts {
    const counts: MeanderJunctionCounts = { tJunctions: 0, xJunctions: 0 };

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
  private tallyNegative(code: ParsedCode): MeanderJunctionCounts {
    const cellRows = code.levels - 1;
    const cellColumns = code.columns - 1;
    const counts: MeanderJunctionCounts = { tJunctions: 0, xJunctions: 0 };

    for (let level = 0; level < cellRows; level += 1) {
      for (let column = 0; column < cellColumns; column += 1) {
        this.tally(counts, this.negativeDegree(code, level, column));
      }
    }

    return counts;
  }

  // 🌎 Public Methods

  /** Computes every raw junction count and boolean Characteristic a Code carries. */
  compute(code: ParsedCode): MeanderCharacteristics {
    const ink = this.tallyInk(code);
    const negative = this.tallyNegative(code);

    return {
      ...this.meanderConnectivityService.connectivity(code),
      hasBranching: ink.tJunctions > 0 || negative.tJunctions > 0,
      hasCrossing: ink.xJunctions > 0 || negative.xJunctions > 0,
      inkTJunctions: ink.tJunctions,
      inkXJunctions: ink.xJunctions,
      negativeTJunctions: negative.tJunctions,
      negativeXJunctions: negative.xJunctions,
    };
  }
}
