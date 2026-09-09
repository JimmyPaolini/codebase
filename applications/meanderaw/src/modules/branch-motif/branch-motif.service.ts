import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import {
  BRANCH_MODES_BY_MODIFIER_NAME,
  BRANCH_UNIT_COLUMNS,
  DEFAULT_BRANCH_MODE,
  RUNG_ORIENTATIONS_BY_DIRECTION,
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
  RungDirection,
  RungOrientation,
} from "./branch-motif.types";

/**
 * Draws the `branch` motif: ink that forks and fills the band, inset from
 * the rules that close it.
 *
 * Every family's ink here is a **forest** — a disjoint union of pieces
 * carrying no loop, `edges = nodes − components`. `negative`'s is the
 * exception, one to thirteen pieces and nearly every one of them full of
 * loops: 0 to 65 of them across the 308 drawings it commits, because a
 * corridor network closes a loop through each of its own repeats. This
 * family was briefly the corpus's one **connected, looped** figure, while a
 * rule ran along both of its borders and closed a loop in every column
 * pair. It is a forest again, because closing both borders
 * unconditionally went too far: a rule drawn along a row the figure already
 * occupies is invisible, and it took the crenellation `stagger` exists for
 * with it. Each mode's figure is now **inset** by one lattice row from
 * every rule beside it — see {@link figureRows} — so no rule touches the
 * ink it closes the band around, and each is a piece of its own.
 *
 * What `branch` adds is therefore the forking, and it is a measurement
 * rather than a description: `MeanderTopologyService.connectivity` reports
 * the numbers, and `branch-motif.service.unit.test.ts` pins the piece
 * count, the fork count, and the free-end count per mode at every row
 * count. Nothing in the charter is about a loop or about connectivity, so
 * this is the family's shape as a graph rather than its compliance.
 *
 * The construction is one idea in three dresses. Every lattice point of the
 * band carries ink, which is invariant 2; the ink joining them is a **spine
 * and teeth** run inside the rules. See {@link BranchMode} for what the
 * three modes keep and {@link border} for how many rules each takes.
 *
 * Three further consequences, all measured rather than assumed:
 *
 * - **It forks, and never crosses.** No lattice point in any mode has four
 *   arms: a rail meets a tooth at the tooth's end, never through its
 *   middle, so the most that ever meets is three. Invariant 3 is relaxed on
 *   purpose and declared as such in the charter property test; invariant 4
 *   holds. At the corpus's own repeat count the fewest forks any mode
 *   leaves is `comb`'s ten, at every row count, so the relaxation is
 *   genuinely exercised everywhere — and the row count where it stopped
 *   being is exactly what sets the family's structural minimum, see
 *   `STRUCTURAL_MINIMUM_ROWS`.
 * - **It stays orthogonal and stays a band.** Every stroke is a run along a
 *   lattice line, so only `M`, `H`, and `V` are emitted (invariant 1), and
 *   the canvas height comes from the shared geometry like every other
 *   family's (invariant 5). Every lattice column is inked including the
 *   first and last, so unlike 6,005 documents in the corpus this family
 *   leaves no gap even at the band's own termination.
 * - **Its interior identifies it.** Which border a mode left bare used to be
 *   the only thing separating some of its drawings from each other. Now
 *   what a reader tells apart is the ink between the rules, and the
 *   integration suite asserts no two of the family's combinations reduce to
 *   one lattice.
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

  /**
   * The lattice rows a `comb` or `stagger` figure's teeth span.
   *
   * Both stop one row short of the band's bottom border row, and `stagger`
   * starts one row past its top one. That inset is the whole point: a rule
   * drawn along a row the figure already occupies is invisible, so a mode
   * whose rail can reach a border row leaves that row to the rule and keeps
   * its own ink off it. `comb` keeps its rail on row 0, which is where a
   * reader already sees the top border, so only the bottom needs clearing;
   * `stagger` moves its rail between the two rows this span ends at, so
   * both borders are cleared and both are ruled. See {@link border} and
   * {@link spineRow}.
   *
   * `rung` reads {@link rungRows} instead, because which of the two borders
   * it clears is its direction's to say rather than the mode's.
   */
  private figureRows(rows: number, mode: BranchMode): BranchSpan {
    return { from: mode === "stagger" ? 1 : 0, to: rows - 1 };
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
  private lastColumn(pattern: RepeatPatternOptions): number {
    return this.unitColumns(pattern.modifier) * pattern.repeatCount - 1;
  }

  /** Which border a `rung` direction rails along and which way its rungs reach, as the pair {@link RUNG_ORIENTATIONS_BY_DIRECTION} maps it to. */
  private orientation(direction: RungDirection): RungOrientation {
    return RUNG_ORIENTATIONS_BY_DIRECTION[direction];
  }

  /**
   * Which lattice row {@link border} rules when a mode takes one rule: the
   * border row the figure's own rail does not run along.
   *
   * `comb` rails along row 0 and is ruled at row `rows`. A `rung` rails
   * along whichever border its direction names, so a north-railed one is
   * ruled at row `rows` like `comb` and a south-railed one at row 0
   * instead. Either way the rule is the border row the figure is inset
   * from, which is what keeps it visible — see {@link rungRows}.
   */
  private ruleRow(pattern: RepeatPatternOptions): number {
    const { modifier, rows } = pattern;

    return modifier?.name === "rung" &&
      this.orientation(modifier.direction).isSouthRailed
      ? 0
      : rows;
  }

  /**
   * The lattice column span one unit's railed run covers: its own rung,
   * plus the rail carrying on to the next unit's stile.
   *
   * The east-facing and west-facing directions are mirror images, and each
   * draws the join between one unit and the next exactly once. Reaching
   * east, the rail runs on past the unit's own columns into the unit after
   * it, and the *last* unit stops short because there is no further stile to
   * reach. Reaching west it runs back into the unit before it, and the
   * *first* unit stops short for the same reason at the other end. Nothing
   * else changes: the number of rail steps is identical either way, so the
   * figure is the same one seen in a mirror.
   *
   * Which border the rail runs along is no business of this span, which
   * covers one lattice row and says nothing about which — see
   * {@link rungUnit}.
   */
  private rungRail(
    placement: BranchUnitPlacement,
    direction: RungDirection,
  ): BranchSpan {
    const { firstColumn, isLastUnit, unitIndex } = placement;
    const stile = this.stileColumn(placement, direction);

    return this.orientation(direction).reachesWest
      ? { from: firstColumn - (unitIndex === 0 ? 0 : 1), to: stile }
      : {
          from: stile,
          to: firstColumn + (isLastUnit ? 1 : BRANCH_UNIT_COLUMNS),
        };
  }

  /**
   * The lattice rows a `rung` figure's stile and rungs span, which is every
   * row of the band but the one its rule closes.
   *
   * A north-railed direction rails along row 0 and spans rows 0 through
   * `rows - 1`, leaving row `rows` to its rule; a south-railed one is that
   * figure turned over, spanning rows 1 through `rows` and leaving row 0.
   * Either way the span covers `rows` of the band's `rows + 1` lattice
   * rows and the rule sits one row clear of it, which is the inset every
   * mode of this family keeps — see {@link figureRows} for the other two
   * modes' and {@link ruleRow} for the rule.
   */
  private rungRows(rows: number, direction: RungDirection): BranchSpan {
    return this.orientation(direction).isSouthRailed
      ? { from: 1, to: rows }
      : { from: 0, to: rows - 1 };
  }

  /**
   * One `rung` repeat unit: a stile down one of the unit's two lattice
   * columns, a rung reaching across to the other at every row the stile
   * spans, and the rail carrying on to the next unit's stile along the
   * border its direction names.
   *
   * The stile and its rungs stop one row short of the border row opposite
   * that rail, which {@link border} rules — see {@link rungRows} — so the
   * unit emits one path per row of that span and one for the stile itself.
   * The rail takes the row at the span's own railed end, so it is one of
   * those paths rather than an extra one: at that row the unit draws the
   * rail instead of a rung.
   *
   * Only the stile's interior points fork: a rung meets it from the side
   * while it runs on above and below, which is `rows - 2` forks per unit,
   * plus `repeatCount - 1` where the rail arrives at a stile's head — the
   * stile at the drawing's own end has no rail beyond it, so it is one
   * fewer than the number of stiles rather than one per stile. That first
   * term is zero at two rows, where the stile spans one step and has no
   * interior point, so the mode draws a bracket per unit and the junction
   * it is named for is absent. It is nevertheless not what sets this
   * family's minimum row count: `stagger` needs a row more than that — see
   * `STRUCTURAL_MINIMUM_ROWS`.
   *
   * The direction mirrors all of that and changes none of its counts. Which
   * column the stile sits in, which way the rungs reach, and which end of
   * the band holds the stile with no rail past it all move together along
   * one axis; which border the rail runs along and which row is ruled move
   * together along the other. So the four directions measure identically
   * and differ only in the drawing. See {@link rungRail} and
   * {@link RungDirection}.
   */
  private rungUnit(
    geometry: GridGeometry,
    placement: BranchUnitPlacement,
    direction: RungDirection,
  ): string {
    const { firstColumn, rows } = placement;
    const rail = this.rungRail(placement, direction);
    const span = this.rungRows(rows, direction);
    const railRow = this.orientation(direction).isSouthRailed
      ? span.to
      : span.from;
    const runs = Array.from({ length: rows }, (_value, index) => {
      const row = span.from + index;

      return this.horizontalRun(
        geometry,
        row,
        row === railRow ? rail : { from: firstColumn, to: firstColumn + 1 },
      );
    });

    return [
      this.verticalRun(geometry, this.stileColumn(placement, direction), span),
      ...runs,
    ].join("");
  }

  /**
   * Which lattice row a unit's rail runs along: an end of the span its own
   * teeth cover, which for `stagger` alternates and for `comb` is always
   * the top.
   *
   * `stagger` decides it per unit — every second one runs along the bottom
   * of its teeth, which is the crenellation. `comb`, the family's default,
   * puts every unit's rail on row 0.
   *
   * Neither row a `stagger` rail can reach is a ruled one: its teeth are
   * inset from both borders, so a rail sitting at either end of them is ink
   * no rule covers, and the alternation a reader is meant to see is what
   * the drawing shows. That was the defect this row fixes — while a rail
   * could only name a border row, and both borders were ruled, every
   * `stagger` drawing rendered as the plain comb.
   */
  private spineRow(
    placement: BranchUnitPlacement,
    modifier: Modifier | undefined,
  ): number {
    const teeth = this.figureRows(placement.rows, this.mode(modifier));

    return modifier?.name === "stagger" && placement.unitIndex % 2 === 1
      ? teeth.to
      : teeth.from;
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
   * covers `unitColumns + 1` teeth — the `branches` its modifier names.
   * Under `comb` the rail never changes side, so the unit width is only a
   * tiling step. Either way the forks belong to the rail: every column it
   * passes over between its two ends carries one, where a tooth meets it
   * from below or above.
   *
   * The teeth stop one row short of the rules {@link border} draws — both
   * of them under `stagger`, the bottom one alone under `comb`. See
   * {@link figureRows} for the span and {@link spineRow} for which of its
   * two ends the rail runs along.
   */
  private spineUnit(
    geometry: GridGeometry,
    placement: BranchUnitPlacement,
    modifier: Modifier | undefined,
  ): string {
    const { firstColumn, isLastUnit, rows, unitColumns } = placement;
    const lastColumn = firstColumn + unitColumns - 1;
    const span = this.figureRows(rows, this.mode(modifier));
    const teeth = Array.from({ length: unitColumns }, (_value, index) =>
      this.verticalRun(geometry, firstColumn + index, span),
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
   * first when the rungs reach east, the last when they reach west.
   *
   * The rungs hang off the side the stile is not on, which is what makes
   * the free ends of one direction land where the other's stile does. It is
   * written against the unit's own width rather than a literal `+ 1`, so
   * the mirror stays at the unit's far edge whatever that width is.
   */
  private stileColumn(
    placement: BranchUnitPlacement,
    direction: RungDirection,
  ): number {
    return this.orientation(direction).reachesWest
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
   * The rules closing the band, drawn once across the whole repeat rather
   * than per unit — and how many of them there are is the mode's, not the
   * family's.
   *
   * Every mode used to leave one border to whatever its own rails reached:
   * `comb` ruled the top and left twelve tooth ends at the bottom, `stagger`
   * alternated, `rung` left every second step of its bottom row bare. So the
   * border read as the mode's signature rather than the band's, and two
   * modes could draw the same interior.
   *
   * Ruling *both* borders unconditionally went too far. `comb` and `rung`
   * already run a rail the full width of row 0, which is the top border a
   * reader sees, so a second run along that row draws nothing new; and
   * `stagger`'s rail could only ever name a border row, so a rule along both
   * of them swallowed the crenellation whole and every `stagger` drawing
   * rendered as the plain comb. See {@link figureRows}.
   *
   * So each mode is ruled where its own ink is not. `comb` and `rung` take
   * one rule, along the row below their free ends; `stagger`, whose figure
   * is inset from both borders, takes both. The pair is
   * `GridGeometryService.borderPath`, which is where every family closing
   * its band that way draws them from, and the single rule is one
   * {@link horizontalRun} along the bottom row of the same width.
   */
  border(geometry: GridGeometry, pattern: RepeatPatternOptions): string {
    if (this.mode(pattern.modifier) === "stagger") {
      return this.gridGeometryService.borderPath(
        geometry,
        this.rightEdge(geometry, pattern),
      );
    }

    return this.horizontalRun(geometry, this.ruleRow(pattern), {
      from: 0,
      to: this.lastColumn(pattern),
    });
  }

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

  /**
   * Draws one repeat unit of whichever spine-and-teeth figure the modifier
   * selects; {@link border} rules the band where that figure is not.
   *
   * The dispatch reads the modifier's own name rather than
   * {@link mode}, because `rung` is the one mode whose drawing needs a
   * parameter only that modifier carries and no other name maps to it. An
   * unrecognized modifier is still refused rather than drawn as the default
   * mode: {@link spineUnit} asks {@link mode} for the span its teeth cover.
   */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const unitColumns = this.unitColumns(unit.modifier);
    const placement: BranchUnitPlacement = {
      firstColumn: unitColumns * unit.unitIndex,
      isLastUnit: unit.isLastUnit,
      rows: unit.rows,
      unitColumns,
      unitIndex: unit.unitIndex,
    };

    return unit.modifier?.name === "rung"
      ? this.rungUnit(geometry, placement, unit.modifier.direction)
      : this.spineUnit(geometry, placement, unit.modifier);
  }

  /** The x-coordinate of the drawing's last lattice column, before the stroke-width margin. */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    return geometry.offset + this.lastColumn(pattern) * geometry.unit;
  }
}
