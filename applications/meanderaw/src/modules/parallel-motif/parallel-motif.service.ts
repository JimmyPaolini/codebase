import { Inject, Injectable } from "@nestjs/common";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import {
  COLUMNS_PER_SERPENTINE_UNIT,
  COLUMNS_PER_STRAND,
  DEFAULT_PARALLEL_STRANDS,
  PARALLEL_MODIFIER_NAMES,
  UnknownParallelModifierError,
} from "./parallel-motif.constants";
import { ParallelSerpentineService } from "./parallel-serpentine.service";

import type { GridGeometry } from "../grid-geometry/grid-geometry.types";
import type {
  Modifier,
  MotifService,
  MotifUnit,
  RepeatPatternOptions,
} from "../meander-generation/meander-generation.types";
import type { ParallelUnitPlacement } from "./parallel-motif.types";

/**
 * Draws the `parallel` motif: `N` strands running alongside one another,
 * turning together, one channel apart.
 *
 * **Nothing here gets thinner.** The stroke stays `unit / 2` at every ply,
 * exactly as in the nine families before it. #413 proposed
 * `strokeWidth = unit / (2N)` on the premise that `N` strands must be
 * squeezed into the footprint one strand occupied; they must not be, and
 * that arithmetic is discarded. Squeezing them produces a uniformly finer
 * lattice, which is `--rows rows × N` under another name, and it is
 * unreachable for a row count whose `N`-fold multiple exceeds the shared
 * maximum. What makes strands read as a bundle here is not their thickness
 * but the fact that they **turn together**.
 *
 * The construction is one idea, and the charter falls out of it rather than
 * being checked for afterwards. A repeat unit is a **bundle of nested
 * brackets** spanning `COLUMNS_PER_STRAND × strands` lattice columns:
 * strand `i` runs down the unit's `i`-th column from the outside, crosses to
 * its mirror column, and runs back, turning `i` lattice rows inside strand
 * `i - 1`'s turn. Even units open upward and odd units downward, so the band
 * reads as ⊔⊓⊔⊓ at whatever ply is asked for.
 *
 * A rule now runs the full width of the repeat along both of the band's
 * borders — see {@link border} — so the strands terminate against a rule
 * rather than in mid-air. Three consequences, every one of them measured in
 * `parallel-motif.service.unit.test.ts` and again in the charter sweep:
 *
 * - **It is space-filling, strictly.** Nested brackets are an exact cover of
 *   the rectangle they span. Take any lattice point of a unit: if it is at
 *   or above its own column's turn row it sits on that column's arm, and if
 *   it is below, the crossbar of the strand whose turn row it is reaches it,
 *   because a point that deep is that far in from the unit's edge. Every
 *   lattice point of the band carries ink, including the first and last
 *   column, so unlike 6,005 documents in the corpus this family leaves no
 *   gap even at the band's own termination.
 * - **It branches, and never crosses.** A rule meets an arm's rising end
 *   with west, east, and south ink at one lattice point — three arms — so
 *   `plied` and `aligned` fork at every interior column of both borders, and
 *   the family relaxes invariant 3. Nothing gains a fourth arm: a border row
 *   has no ink above it, so invariant 4 still holds everywhere. 642 of the
 *   family's 786 drawings fork, and they are exactly the ones a border rule
 *   added ink to; the fewest any of them leaves is 10.
 * - **The ply is the component count only under `serpentine`.** A bracket's
 *   two arms both end on the same border, so ruling it joins every strand of
 *   every unit into one looped figure with no free end left. A stack of
 *   ribbons keeps its `N` pieces, because only the top and bottom of the
 *   stack reach a border at all.
 *
 * `strands` is bounded above by `rows` rather than by the shared maximum.
 * The innermost strand's arms are `rows - strands + 1` lattice steps long,
 * so one ply further collapses them onto its own crossbar and leaves a bare
 * segment running alongside nothing. `MeanderGenerationService` enforces the
 * bound; the collapse itself is measured in this family's unit test so the
 * number and its reason cannot drift apart.
 *
 * The geometry is **derived**, not attested. Double-lined key patterns are
 * real Greek ornament, but this is not one of them redrawn: `N` strands
 * cannot trace the path one strand traces, so the shapes here are new, and
 * there is no hand-drawn reference to check them against. The committed
 * output in `output/` is its own baseline, pinned by measurement rather than
 * by likeness.
 */
@Injectable()
export class ParallelMotifService implements MotifService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(GridGeometryService)
    private readonly gridGeometryService: GridGeometryService,
    @Inject(ParallelSerpentineService)
    private readonly parallelSerpentineService: ParallelSerpentineService,
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

  /** The lattice column the drawing ends at: one short of the columns its repeat units span, since the units count lattice columns rather than the gaps between them. */
  private lastColumn(strands: number, repeatCount: number): number {
    return COLUMNS_PER_STRAND * strands * repeatCount - 1;
  }

  /**
   * Which way a repeat unit's bundle opens.
   *
   * `plied` and the unmodified drawing alternate by unit index, so the band
   * reads ⊔⊓⊔⊓ — the flip is what makes a row of brackets read as a running
   * border rather than as a row of identical stamps. `aligned` is the same
   * bundle with that alternation taken away: every unit opens upward, and
   * the band reads ⊔⊔⊔⊔.
   *
   * Nothing about the charter turns on this. A bundle's exact cover of its
   * own repeat unit is an argument about the unit's interior, and it holds
   * whichever way round the unit is drawn — so `aligned` is space-filling,
   * forks against the border rules, and crosses nowhere, for exactly the
   * reasons `plied` does. What changes is only what the eye does with it.
   */
  private opensUp(modifier: Modifier | undefined, unitIndex: number): boolean {
    if (modifier?.name === "aligned") {
      return true;
    }

    return unitIndex % 2 === 0;
  }

  /**
   * One strand of a bundle: down one arm, across the crossbar, and back up
   * the other, drawn as a single run so the strand is one path rather than
   * three.
   *
   * `index` counts inward from the bundle's outside, and it is both the
   * number of lattice columns the strand is inset by and the number of
   * lattice rows its turn is inset by. That single number is what makes the
   * strands nest: each one turns exactly one channel inside the last.
   */
  private strandPath(
    geometry: GridGeometry,
    placement: ParallelUnitPlacement,
    index: number,
  ): string {
    const { firstColumn, opensUp, rows, strands } = placement;
    const openRow = opensUp ? 0 : rows;
    const turnRow = opensUp ? rows - index : index;
    const nearColumn = firstColumn + index;
    const farColumn = firstColumn + COLUMNS_PER_STRAND * strands - 1 - index;

    return `M${this.coordinate(geometry, nearColumn)} ${this.coordinate(
      geometry,
      openRow,
    )}V${this.coordinate(geometry, turnRow)}H${this.coordinate(
      geometry,
      farColumn,
    )}V${this.coordinate(geometry, openRow)}`;
  }

  // 🌎 Public Methods

  /**
   * The rule along both border rows, drawn once across the whole repeat
   * rather than per unit.
   *
   * Every shape used to leave its borders to whatever its own ink reached: a
   * bracket bundle's arms stopped in mid-air at the border it opened onto,
   * and a serpentine ruled a border only where a flat strip happened to land
   * on it. So a border read as the shape's signature rather than as the
   * band's, and the family's four one-strand variants drew the same interior.
   * Ruling both makes the strands terminate against a rule, which is what
   * starts this family branching — see the class comment. Ink a shape already
   * laid on a border row is now a subset of this rule and harmless: the
   * lattice records each step once.
   *
   * The two runs themselves are `GridGeometryService.borderPath`, which is
   * where every family closing its band this way draws them from; all this
   * adds is where the band's right edge falls — which for this family is a
   * question its own {@link rightEdge} answers differently per shape.
   */
  border(geometry: GridGeometry, pattern: RepeatPatternOptions): string {
    return this.gridGeometryService.borderPath(
      geometry,
      this.rightEdge(geometry, pattern),
    );
  }

  /**
   * Draws one repeat unit: a bundle of nested brackets under `plied` and
   * `aligned`, and a slice of every stacked ribbon under `serpentine`.
   *
   * The three shapes share one axis and differ on everything else, so the
   * dispatch is here rather than inside the geometry: `strandCount` reads
   * the same `strands` off all three, and only then does the unit become a
   * bundle or a stack.
   */
  path(geometry: GridGeometry, unit: MotifUnit): string {
    const strands = this.strandCount(unit.modifier);

    if (unit.modifier?.name === "serpentine") {
      return this.parallelSerpentineService.path(geometry, unit, strands);
    }

    const placement: ParallelUnitPlacement = {
      firstColumn: COLUMNS_PER_STRAND * strands * unit.unitIndex,
      opensUp: this.opensUp(unit.modifier, unit.unitIndex),
      rows: unit.rows,
      strands,
    };

    return Array.from({ length: strands }, (_value, index) =>
      this.strandPath(geometry, placement, index),
    ).join("");
  }

  /**
   * The x-coordinate of the drawing's last lattice column, before the
   * stroke-width margin.
   *
   * The two shapes measure their width differently because they nest on
   * different axes: a bracket bundle's pitch grows with the ply, and a
   * serpentine's does not. Reading the ply for a serpentine would widen the
   * canvas past the ink and leave a blank margin down the right-hand side.
   */
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number {
    const columns =
      pattern.modifier?.name === "serpentine"
        ? COLUMNS_PER_SERPENTINE_UNIT * pattern.repeatCount - 1
        : this.lastColumn(
            this.strandCount(pattern.modifier),
            pattern.repeatCount,
          );

    return geometry.offset + columns * geometry.unit;
  }

  /**
   * How many strands a drawing's modifier asks for; no modifier draws
   * {@link DEFAULT_PARALLEL_STRANDS}.
   *
   * The dispatch is total rather than defaulted: this family declares
   * `plied`, `aligned`, and `serpentine` compatible — all three name the
   * same ply axis — and any other name is refused.
   * Nothing can reach that refusal through
   * `MeanderGenerationService.generate`, which validates compatibility
   * first — but a family that answered "the default ply" to a modifier it
   * did not recognize would ink the wrong drawing silently, and this one
   * says so instead.
   */
  strandCount(modifier: Modifier | undefined): number {
    if (modifier === undefined) {
      return DEFAULT_PARALLEL_STRANDS;
    }

    if (!PARALLEL_MODIFIER_NAMES.includes(modifier.name)) {
      throw new UnknownParallelModifierError(modifier.name);
    }

    if (!("strands" in modifier)) {
      throw new UnknownParallelModifierError(modifier.name);
    }

    return modifier.strands;
  }
}
