import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import {
  BRANCH_MODES_BY_MODIFIER_NAME,
  BRANCH_UNIT_COLUMNS,
  DEFAULT_BRANCH_MODE,
  UnknownBranchModeError,
} from "./branch-motif.constants";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  Modifier,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "../meander-generation/meander-generation.types";
import type {
  BranchMode,
  BranchModifierName,
  BranchSpan,
  BranchUnitPlacement,
} from "./branch-motif.types";

/**
 * Draws the `branch` motif: ink that forks and never closes a loop.
 *
 * Every other family's ink is a **forest** — a disjoint union of simple
 * arcs, `edges = nodes − components` with the component count in the
 * dozens. `negative`'s is one to five pieces, every one of them full of
 * loops: 10 to 45 of them in the eighteen drawings it commits, because a
 * corridor network closes a loop through each of its own repeats. Not one of
 * the
 * 3,317 documents this repository committed before this family is a
 * **tree**, and every one of this family's is. That is the whole of what
 * `branch` adds, and it is a measurement rather than a description —
 * `MeanderTopologyService.connectivity` reports the three numbers and
 * `branch-motif.service.unit.test.ts` asserts `components === 1` and
 * `edges === nodes − 1` at every row count, in every mode.
 *
 * The construction is one idea in three dresses, and the tree property
 * falls out of it rather than being checked for afterwards. Every lattice
 * point of the band carries ink, which is invariant 2; the ink joining them
 * is a **spine and teeth**, arranged so that the number of steps is exactly
 * one fewer than the number of points, and so that the figure stays in one
 * piece. A connected figure with `nodes − 1` edges cannot contain a loop,
 * so no mode has to be searched for cycles — it has no room for one. See
 * {@link BranchMode} for what the three modes keep.
 *
 * Two further consequences, both measured rather than assumed:
 *
 * - **It forks, and never crosses.** No lattice point in any mode has four
 *   arms: a rail meets a tooth at its end, never through its middle, so the
 *   most that ever meets is three. Invariant 3 is relaxed on purpose and
 *   declared as such in the charter property test; invariant 4 holds.
 * - **It stays orthogonal and stays a band.** Every stroke is a run along a
 *   lattice line, so only `M`, `H`, and `V` are emitted (invariant 1), and
 *   the canvas height comes from the shared geometry like every other
 *   family's (invariant 5). Every lattice column is inked including the
 *   first and last, so unlike 2,120 documents in the corpus this family
 *   leaves no gap even at the band's own termination.
 *
 * The geometry is **derived**, not attested. There is no hand-drawn
 * reference for a branching meander — the six older families have
 * byte-exact reference SVGs and this one has none — so its committed output
 * in `output/` is its own baseline, pinned by measurement rather than by
 * likeness.
 */
@Injectable()
export class BranchMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** One grid level as a formatted pixel coordinate; the grid is square, so a row and a column convert the same way. */
  private coordinate(geometry: GridGeometry, level: number): string {
    return this.gridGeometryService.formatCoordinate(
      geometry.offset + level * geometry.unit,
    );
  }

  /** One horizontal run's path data, along `row` across the given lattice column span. */
  private horizontalRun(
    geometry: GridGeometry,
    row: number,
    columns: BranchSpan,
  ): string {
    return `M${this.coordinate(geometry, columns.from)} ${this.coordinate(
      geometry,
      row,
    )}H${this.coordinate(geometry, columns.to)}`;
  }

  /** Narrows a modifier name to one this family draws a mode for, without an unchecked assertion. */
  private isBranchModifierName(
    name: Modifier["name"],
  ): name is BranchModifierName {
    return Object.hasOwn(BRANCH_MODES_BY_MODIFIER_NAME, name);
  }

  /** The lattice column the drawing ends at: one short of the columns its repeat units span, since the units count lattice columns rather than the gaps between them. */
  private lastColumn(repeatCount: number): number {
    return BRANCH_UNIT_COLUMNS * repeatCount - 1;
  }

  /**
   * One `rung` repeat unit: a stile down the unit's first lattice column, a
   * rung reaching from it to the unit's second column at every lattice row,
   * and — for every unit but the last — the rail carrying on into the next
   * unit along the top row.
   *
   * The rail and the top rung are drawn as one run rather than two, so the
   * unit emits one path per lattice row and one for the stile. Only the
   * stile's interior points fork: a rung meets it from the right while it
   * runs on above and below, which is `rows - 1` forks per unit, plus
   * `repeatCount - 1` where the rail arrives at a stile's head — the first
   * stile has no rail on its left, so it is one fewer than the number of
   * stiles rather than one per stile. That first term is what sets this
   * family's minimum row count — see `STRUCTURAL_MINIMUM_ROWS`.
   */
  private rungUnit(
    geometry: GridGeometry,
    placement: BranchUnitPlacement,
  ): string {
    const { firstColumn, isLastUnit, rows } = placement;
    const railEnd = firstColumn + (isLastUnit ? 1 : BRANCH_UNIT_COLUMNS);
    const runs = Array.from({ length: rows + 1 }, (_value, row) =>
      this.horizontalRun(geometry, row, {
        from: firstColumn,
        to: row === 0 ? railEnd : firstColumn + 1,
      }),
    );

    return [
      this.verticalRun(geometry, firstColumn, { from: 0, to: rows }),
      ...runs,
    ].join("");
  }

  /**
   * Which lattice row a unit's rail runs along: the band's top row, except
   * under `stagger`, where every second unit's rail runs along the bottom
   * instead.
   *
   * Alternating the rail costs the figure nothing structurally — the number
   * of rail steps is the same either way, so the tree property is
   * untouched — and it changes which lattice points fork: a column where
   * the rail changes side carries only one rail step, so it is a corner
   * rather than a fork.
   */
  private spineRow(placement: BranchUnitPlacement, mode: BranchMode): number {
    return mode === "stagger" && placement.unitIndex % 2 === 1
      ? placement.rows
      : 0;
  }

  /**
   * One `comb` or `stagger` repeat unit: a full tooth down each of the
   * unit's own lattice columns, and the rail joining them.
   *
   * The rail runs one column past the unit's own, so the join to the next
   * unit is drawn exactly once and by the unit on its left. The last unit
   * stops at its own last column instead: a rail carrying on past the end
   * would reach a column with no tooth under it.
   */
  private spineUnit(
    geometry: GridGeometry,
    placement: BranchUnitPlacement,
    mode: BranchMode,
  ): string {
    const { firstColumn, isLastUnit, rows } = placement;
    const lastColumn = firstColumn + BRANCH_UNIT_COLUMNS - 1;
    const teeth = Array.from({ length: BRANCH_UNIT_COLUMNS }, (_value, index) =>
      this.verticalRun(geometry, firstColumn + index, { from: 0, to: rows }),
    );

    return [
      ...teeth,
      this.horizontalRun(geometry, this.spineRow(placement, mode), {
        from: firstColumn,
        to: isLastUnit ? lastColumn : lastColumn + 1,
      }),
    ].join("");
  }

  /** One vertical run's path data, down `column` across the given lattice row span. */
  private verticalRun(
    geometry: GridGeometry,
    column: number,
    rows: BranchSpan,
  ): string {
    return `M${this.coordinate(geometry, column)} ${this.coordinate(
      geometry,
      rows.from,
    )}V${this.coordinate(geometry, rows.to)}`;
  }

  // 🌎 Public Methods

  /**
   * Which mode a drawing's modifier selects; no modifier inks
   * {@link DEFAULT_BRANCH_MODE}.
   *
   * The dispatch is total rather than defaulted: every name this family
   * declares compatible has an entry in
   * {@link BRANCH_MODES_BY_MODIFIER_NAME}, a missing one is a type error,
   * and any name outside it is refused. Nothing can reach that refusal
   * through `MeanderGenerationService.generate`, which validates
   * compatibility first — but a family that answered "no modifier" to a
   * modifier it did not recognize would ink the wrong mode silently, and
   * this one says so instead.
   */
  mode(modifier: Modifier | undefined): BranchMode {
    if (modifier === undefined) {
      return DEFAULT_BRANCH_MODE;
    }

    if (!this.isBranchModifierName(modifier.name)) {
      throw new UnknownBranchModeError(modifier.name);
    }

    return BRANCH_MODES_BY_MODIFIER_NAME[modifier.name];
  }

  /** Draws one repeat unit of whichever spanning tree the modifier selects. */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const mode = this.mode(unit.modifier);
    const placement: BranchUnitPlacement = {
      firstColumn: BRANCH_UNIT_COLUMNS * unit.unitIndex,
      isLastUnit: unit.isLastUnit,
      rows: unit.rows,
      unitIndex: unit.unitIndex,
    };

    return mode === "rung"
      ? this.rungUnit(geometry, placement)
      : this.spineUnit(geometry, placement, mode);
  }

  /** The x-coordinate of the drawing's last lattice column, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    return (
      geometry.offset + this.lastColumn(pattern.repeatCount) * geometry.unit
    );
  }
}
