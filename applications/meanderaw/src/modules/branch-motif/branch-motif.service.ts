import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import {
  BRANCH_MODES_BY_MODIFIER_NAME,
  BRANCH_UNIT_COLUMNS,
  DEFAULT_BRANCH_MODE,
  DEFAULT_COMB_IS_UPWARD,
  DEFAULT_RUNG_IS_LEFTWARD,
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
 *   first and last, so unlike 2,176 documents in the corpus this family
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

  /**
   * Which way a `rung` drawing's rungs point, read off its own modifier.
   *
   * Every other mode answers `false` and never asks: the direction is
   * `rung`'s alone, and `spineUnit` has no side for a tooth to be on. The
   * fallback is {@link DEFAULT_RUNG_IS_LEFTWARD} rather than an inline
   * literal, so the direction a bare `--modifier rung` draws is stated in
   * one place.
   */
  private isLeftward(modifier: Modifier | undefined): boolean {
    return modifier?.name === "rung"
      ? modifier.isLeftward
      : DEFAULT_RUNG_IS_LEFTWARD;
  }

  /**
   * Which way a `comb` drawing's teeth reach, read off its own modifier.
   *
   * Only `comb` answers anything but {@link DEFAULT_COMB_IS_UPWARD}, and
   * only `comb` could: `stagger` puts its rail on both border rows already,
   * and `rung`'s rail is not what its teeth hang from.
   */
  private isUpward(modifier: Modifier | undefined): boolean {
    return modifier?.name === "comb"
      ? modifier.isUpward
      : DEFAULT_COMB_IS_UPWARD;
  }

  /** The lattice column the drawing ends at: one short of the columns its repeat units span, since the units count lattice columns rather than the gaps between them. */
  private lastColumn(pattern: RepeatPatternOptions): number {
    return this.unitColumns(pattern.modifier) * pattern.repeatCount - 1;
  }

  /**
   * The lattice column span one unit's row-0 run covers: its own rung, plus
   * the rail carrying on to the next unit's stile.
   *
   * The two directions are mirror images, and each draws the join between
   * one unit and the next exactly once. Pointing right, the rail runs on
   * past the unit's own columns into the unit after it, and the *last* unit
   * stops short because there is no further stile to reach. Pointing left
   * it runs back into the unit before it, and the *first* unit stops short
   * for the same reason at the other end. Nothing else changes: the number
   * of rail steps is identical either way, so the figure is the same tree
   * seen in a mirror.
   */
  private rungRail(
    placement: BranchUnitPlacement,
    isLeftward: boolean,
  ): BranchSpan {
    const { firstColumn, isLastUnit, unitIndex } = placement;
    const stile = this.stileColumn(placement, isLeftward);

    return isLeftward
      ? { from: firstColumn - (unitIndex === 0 ? 0 : 1), to: stile }
      : {
          from: stile,
          to: firstColumn + (isLastUnit ? 1 : BRANCH_UNIT_COLUMNS),
        };
  }

  /**
   * One `rung` repeat unit: a stile down one of the unit's two lattice
   * columns, a rung reaching across to the other at every lattice row, and
   * the rail carrying on to the next unit's stile along the top row.
   *
   * The rail and the top rung are drawn as one run rather than two, so the
   * unit emits one path per lattice row and one for the stile. Only the
   * stile's interior points fork: a rung meets it from the side while it
   * runs on above and below, which is `rows - 1` forks per unit, plus
   * `repeatCount - 1` where the rail arrives at a stile's head — the stile
   * at the drawing's own end has no rail beyond it, so it is one fewer than
   * the number of stiles rather than one per stile. That first term is what
   * sets this family's minimum row count — see `STRUCTURAL_MINIMUM_ROWS`.
   *
   * `isLeftward` mirrors all of that and changes none of its counts. Which
   * column the stile sits in, which way the rungs reach, and which end of
   * the band holds the stile with no rail past it all move together, so the
   * two directions measure identically and differ only in the drawing. See
   * {@link rungRail}.
   */
  private rungUnit(
    geometry: GridGeometry,
    placement: BranchUnitPlacement,
    isLeftward: boolean,
  ): string {
    const { firstColumn, rows } = placement;
    const rail = this.rungRail(placement, isLeftward);
    const runs = Array.from({ length: rows + 1 }, (_value, row) =>
      this.horizontalRun(
        geometry,
        row,
        row === 0 ? rail : { from: firstColumn, to: firstColumn + 1 },
      ),
    );

    return [
      this.verticalRun(geometry, this.stileColumn(placement, isLeftward), {
        from: 0,
        to: rows,
      }),
      ...runs,
    ].join("");
  }

  /**
   * Which of the band's two border rows a unit's rail runs along.
   *
   * `stagger` decides it per unit — every second one runs along the bottom,
   * which is the crenellation. Every other spine drawing puts every unit's
   * rail on the same row, and `comb`'s modifier says which: the top by
   * default, so its teeth hang down, or the bottom under `--upward`, so
   * they stand up.
   *
   * Moving the rail costs the figure nothing structurally — the number of
   * rail steps is the same wherever it runs, so the tree property is
   * untouched. Under `stagger` it also changes which lattice points fork: a
   * column where the rail changes side carries only one rail step, so it is
   * a corner rather than a fork. A `comb` that moves its rail as a whole
   * forks in exactly the same places, one border row down.
   */
  private spineRow(
    placement: BranchUnitPlacement,
    modifier: Modifier | undefined,
  ): number {
    if (modifier?.name === "stagger") {
      return placement.unitIndex % 2 === 1 ? placement.rows : 0;
    }

    return this.isUpward(modifier) ? placement.rows : 0;
  }

  /**
   * One `comb` or `stagger` repeat unit: a full tooth down each of the
   * unit's own lattice columns, and the rail joining them.
   *
   * The rail runs one column past the unit's own, so the join to the next
   * unit is drawn exactly once and by the unit on its left. The last unit
   * stops at its own last column instead: a rail carrying on past the end
   * would reach a column with no tooth under it.
   *
   * Under `stagger` the unit is as wide as its own crenel, so a rail run
   * covers `unitColumns + 1` teeth — the `branches` its modifier names —
   * and the teeth strictly inside that run are the mode's forks. Under
   * `comb` the rail never changes side, so the unit width is only a tiling
   * step and every interior column forks whatever it is.
   *
   * The teeth span the whole band in both modes, so which border row the
   * rail runs along is the only thing left for a direction to change — see
   * {@link spineRow}.
   */
  private spineUnit(
    geometry: GridGeometry,
    placement: BranchUnitPlacement,
    modifier: Modifier | undefined,
  ): string {
    const { firstColumn, isLastUnit, rows, unitColumns } = placement;
    const lastColumn = firstColumn + unitColumns - 1;
    const teeth = Array.from({ length: unitColumns }, (_value, index) =>
      this.verticalRun(geometry, firstColumn + index, { from: 0, to: rows }),
    );

    return [
      ...teeth,
      this.horizontalRun(geometry, this.spineRow(placement, modifier), {
        from: firstColumn,
        to: isLastUnit ? lastColumn : lastColumn + 1,
      }),
    ].join("");
  }

  /**
   * Which of a `rung` unit's two lattice columns carries its stile: the
   * first when the rungs point right, the second when they point left.
   *
   * The rungs hang off the side the stile is not on, which is what makes
   * the free ends of one direction land where the other's stile does. It is
   * written against the unit's own width rather than a literal `+ 1`, so
   * the mirror stays at the unit's far edge whatever that width is.
   */
  private stileColumn(
    placement: BranchUnitPlacement,
    isLeftward: boolean,
  ): number {
    return isLeftward
      ? placement.firstColumn + placement.unitColumns - 1
      : placement.firstColumn;
  }

  /**
   * How many lattice columns one repeat unit of this drawing spans.
   *
   * `stagger` is the only mode that answers anything but
   * {@link BRANCH_UNIT_COLUMNS}: its rail changes side once per unit, so a
   * unit's width *is* the crenel's width, and a run joining `branches`
   * teeth spans `branches - 1` steps between them. The other two modes have
   * no such freedom — `rung` needs exactly two columns for a stile and the
   * free ends of its rungs, and every column of `comb` carries the same
   * full tooth, so widening its unit would change nothing it draws.
   */
  private unitColumns(modifier: Modifier | undefined): number {
    return modifier?.name === "stagger"
      ? modifier.branches - 1
      : BRANCH_UNIT_COLUMNS;
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
    const unitColumns = this.unitColumns(unit.modifier);
    const placement: BranchUnitPlacement = {
      firstColumn: unitColumns * unit.unitIndex,
      isLastUnit: unit.isLastUnit,
      rows: unit.rows,
      unitColumns,
      unitIndex: unit.unitIndex,
    };

    return mode === "rung"
      ? this.rungUnit(geometry, placement, this.isLeftward(unit.modifier))
      : this.spineUnit(geometry, placement, unit.modifier);
  }

  /** The x-coordinate of the drawing's last lattice column, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    return geometry.offset + this.lastColumn(pattern) * geometry.unit;
  }
}
