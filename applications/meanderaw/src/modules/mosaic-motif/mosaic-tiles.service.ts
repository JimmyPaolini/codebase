import { Inject, Injectable } from "@nestjs/common";

import { MosaicSymmetryService } from "./mosaic-symmetry.service";

import type {
  MosaicCoverState,
  MosaicPiece,
  MosaicTile,
} from "./mosaic-motif.types";

/**
 * Enumerates every distinct `mosaic` tile at a given size. A tile is an
 * exact cover of its `columns` by `rows - 1` grid of cells: each cell is
 * claimed once, by a dot on its own, by a vertical dash sharing it with the
 * cell below, or by a horizontal dash sharing it with the cell to its right
 * — wrapping into the next repeat tile from the last column, which at a
 * single column degenerates into the continuous rule `lines` draws.
 *
 * That exact-cover framing is what makes the family both complete and
 * space-filling: every arrangement of dots and one-unit dashes that leaves
 * no cell blank is enumerated exactly once, and nothing longer than one
 * grid unit can be expressed at all.
 */
@Injectable()
export class MosaicTilesService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicSymmetryService)
    private readonly mosaicSymmetryService: MosaicSymmetryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Every piece that could claim `cell`, in the order the search tries
   * them. A horizontal dash reaching this cell from the column to its left
   * is offered alongside the one reaching right, since with three or more
   * columns those cover genuinely different cell pairs — at one or two
   * columns they collapse onto the same pair and
   * {@link MosaicSymmetryService.canonicalIdentifier} folds them together.
   */
  private candidatePieces(
    cell: number,
    state: MosaicCoverState,
  ): MosaicPiece[] {
    const { columns, rows } = state;
    const column = cell % columns;
    const level = Math.floor(cell / columns);
    const candidates: MosaicPiece[] = [{ column, kind: "dot", level }];

    if (level + 1 < rows - 1) {
      candidates.push({ column, kind: "vertical", level });
    }

    if (columns === 1) {
      candidates.push({ column, kind: "line", level });

      return candidates;
    }

    candidates.push(
      { column, kind: "horizontal", level },
      { column: (column - 1 + columns) % columns, kind: "horizontal", level },
    );

    return candidates;
  }

  /**
   * Claims the first unclaimed cell from `cell` onward in every way it can
   * be claimed, recording a tile once every cell is spoken for. Recursing
   * on the first unclaimed cell rather than on every cell is what keeps the
   * search from finding the same cover in several orders.
   */
  private coverFrom(cell: number, state: MosaicCoverState): void {
    if (cell === state.claimed.length) {
      this.recordTile(state);

      return;
    }

    if (state.claimed[cell]) {
      this.coverFrom(cell + 1, state);

      return;
    }

    for (const piece of this.candidatePieces(cell, state)) {
      const cells = this.mosaicSymmetryService.coveredCells(
        piece,
        state.columns,
      );

      if (cells.some((claimed) => state.claimed[claimed])) {
        continue;
      }

      this.setClaimed(cells, state, true);
      state.pieces.push(piece);
      this.coverFrom(cell + 1, state);
      state.pieces.pop();
      this.setClaimed(cells, state, false);
    }
  }

  /** Keeps the finished cover, unless a tile already seen draws the same pattern. */
  private recordTile(state: MosaicCoverState): void {
    const tile: MosaicTile = {
      columns: state.columns,
      pieces: [...state.pieces],
      rows: state.rows,
    };
    const identifier = this.mosaicSymmetryService.canonicalIdentifier(tile);

    if (!state.tilesByIdentifier.has(identifier)) {
      state.tilesByIdentifier.set(identifier, tile);
    }
  }

  /** Sets or clears the claim on every cell a piece covers. */
  private setClaimed(
    cells: readonly number[],
    state: MosaicCoverState,
    claimed: boolean,
  ): void {
    for (const cell of cells) {
      state.claimed[cell] = claimed;
    }
  }

  // 🌎 Public Methods

  /**
   * Every distinct tile of the given size, one per symmetry class, ordered
   * by canonical identifier so the sweep is stable across runs.
   */
  enumerate(rows: number, columns: number): MosaicTile[] {
    const state: MosaicCoverState = {
      claimed: Array.from({ length: columns * (rows - 1) }, () => false),
      columns,
      pieces: [],
      rows,
      tilesByIdentifier: new Map<string, MosaicTile>(),
    };

    this.coverFrom(0, state);

    return [...state.tilesByIdentifier.entries()]
      .toSorted(([first], [second]) => first.localeCompare(second))
      .map(([, tile]) => tile);
  }
}
