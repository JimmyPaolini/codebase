import { Inject, Injectable } from "@nestjs/common";

import {
  COMPATIBLE_MODIFIERS,
  DEFAULT_REPEAT_COUNT,
  MAXIMUM_VALUE,
  MINIMUM_STRANDS,
  PLY_MODIFIER_NAMES,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
  TYPES_WITH_MODIFIER_NAMED_DEFAULT,
} from "../meander-generation/meander-generation.constants";
import { ParallelSerpentineService } from "../parallel-motif/parallel-serpentine.service";

import { ALTERNATED_SWEEP_PERIODS, DOT_SWEEP_SHAPES } from "./draw.constants";

import type {
  GenerationParameters,
  MeanderType,
  Modifier,
  PlyModifierName,
} from "../meander-generation/meander-generation.types";

/**
 * Enumerates the named-type half of the sweep: every implemented type,
 * crossed with every modifier `COMPATIBLE_MODIFIERS` lists for it plus "no
 * modifier", crossed with every row count from that type's own
 * `STRUCTURAL_MINIMUM_ROWS` through the shared `MAXIMUM_VALUE`.
 * `alternated` and `dot` each expand to the representative values
 * `draw.constants.ts` names rather than their full range, and `repeatCount` is
 * `DEFAULT_REPEAT_COUNT` except for the spin family, which is rounded up to
 * the nearest multiple of `SPIN_CYCLE_LENGTH` so the generation service
 * never rejects a cut-off rotation.
 *
 * It is a service of its own, rather than private methods on
 * {@link DrawCommand}, because two callers need the same space and a
 * second copy of this composition would be a guarantee nothing enforces:
 * `DrawCommand` writes it to `output/`, and the meander charter's property
 * test sweeps it. Sharing the constants is not enough — the composition is
 * what decides which documents exist, and both must agree on all of it for
 * the charter to gate the corpus the repository actually commits.
 *
 * Adding a family therefore widens both at once, and adds nothing here: the
 * enumeration is driven entirely by `SUPPORTED_TYPES`,
 * `COMPATIBLE_MODIFIERS`, and `STRUCTURAL_MINIMUM_ROWS`.
 */
@Injectable()
export class DrawCombinationsService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ParallelSerpentineService)
    private readonly parallelSerpentineService: ParallelSerpentineService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Enumerates every combination for a single type: every swept row count crossed with every swept modifier. */
  private combinationsForType(type: MeanderType): GenerationParameters[] {
    return this.rowsSweep(type).flatMap((rowCount) =>
      this.modifiersForType(type, rowCount).map((modifier) => ({
        repeatCount: this.repeatCountFor(modifier),
        rows: rowCount,
        type,
        ...(modifier ? { modifier } : {}),
      })),
    );
  }

  /**
   * Expands one modifier name into every {@link Modifier} value the sweep
   * covers at `rowCount`.
   *
   * `alternated` and `dot` ignore the row count and expand to the
   * representative values `draw.constants.ts` names. `plied` does not: its
   * range *is* the row count, so it is the one modifier whose expansion has
   * to be asked per row rather than once per family — see
   * {@link pliedStrandCounts}.
   */
  private expandModifierName(
    name: Modifier["name"],
    rowCount: number,
  ): Modifier[] {
    if (name === "alternated") {
      return ALTERNATED_SWEEP_PERIODS.map((period) => ({ name, period }));
    }

    if (name === "dot") {
      return DOT_SWEEP_SHAPES.map((shape) => ({ name, shape }));
    }

    if (name === "serpentine") {
      return this.strandCounts(rowCount).flatMap((strands) =>
        this.parallelSerpentineService
          .variants(rowCount, strands)
          .map((variant) => ({ name, strands, ...variant })),
      );
    }

    if (this.isPlyModifierName(name)) {
      return this.strandCounts(rowCount).map((strands) => ({ name, strands }));
    }

    return [{ name }];
  }

  /** Narrows a raw string to a supported {@link MeanderType} without an unchecked assertion. */
  private isMeanderType(value: string): value is MeanderType {
    return SUPPORTED_TYPES.includes(value);
  }

  /** Narrows a raw string to a supported {@link Modifier} name without an unchecked assertion. */
  private isModifierName(value: string): value is Modifier["name"] {
    return SUPPORTED_MODIFIER_NAMES.includes(value);
  }

  /** Narrows a modifier name to one of the ply-carrying ones, so its expansion can supply the `strands` those members require. */
  private isPlyModifierName(value: Modifier["name"]): value is PlyModifierName {
    return PLY_MODIFIER_NAMES.includes(value);
  }

  /** Every modifier the sweep covers for `type` at `rowCount`: `undefined` (no modifier) plus every value of each compatible modifier. */
  private modifiersForType(
    type: MeanderType,
    rowCount: number,
  ): (Modifier | undefined)[] {
    const modifierNames = COMPATIBLE_MODIFIERS[type].filter(
      (value): value is Modifier["name"] => this.isModifierName(value),
    );

    const expanded = modifierNames.flatMap((name) =>
      this.expandModifierName(name, rowCount),
    );

    if (TYPES_WITH_MODIFIER_NAMED_DEFAULT.includes(type)) {
      return expanded;
    }

    return [undefined, ...expanded];
  }

  /** The `repeatCount` a combination uses: `DEFAULT_REPEAT_COUNT`, rounded up to the spin family's required cycle length when needed. */
  private repeatCountFor(modifier: Modifier | undefined): number {
    if (modifier && SPIN_FAMILY_MODIFIER_NAMES.includes(modifier.name)) {
      return (
        Math.ceil(DEFAULT_REPEAT_COUNT / SPIN_CYCLE_LENGTH) * SPIN_CYCLE_LENGTH
      );
    }

    return DEFAULT_REPEAT_COUNT;
  }

  /** Every `rows` value the sweep covers for `type`: its own structural minimum through `MAXIMUM_VALUE`. */
  private rowsSweep(type: MeanderType): number[] {
    const minimum = STRUCTURAL_MINIMUM_ROWS[type];
    const length = MAXIMUM_VALUE - minimum + 1;

    return Array.from({ length }, (_value, index) => minimum + index);
  }

  /**
   * Every ply the sweep draws for `name` at `rowCount`: the family's whole
   * range there, from {@link MINIMUM_STRANDS} up to the row count itself,
   * less the one ply that would duplicate the unmodified drawing.
   *
   * The bound is the row count because that is where the geometry's bound
   * is — a bundle's innermost strand has `rows - strands + 1` lattice steps
   * of arm, so one ply further leaves it a bare crossbar running alongside
   * nothing, and `MeanderGenerationService.generate` refuses it. Asking per
   * row is what lets the sweep draw a twelve-ply bundle at twelve rows
   * *and* a one-ply bundle at four, which a single flat list cannot: a list
   * is applied to every row count alike, so its deepest entry has to be
   * shallow enough for the shallowest row count to accept — which is why
   * the sweep used to stop at four plies and `parallel`'s
   * `STRUCTURAL_MINIMUM_ROWS` had to be pinned to that same four.
   *
   * Neither number is pinned to the other any more, and nothing is lost by
   * it: every combination this yields is valid at the row count it was
   * asked for, by construction rather than by a test noticing.
   *
   * The range has no hole in it any more. `plied` used to skip the family's
   * own default ply, because a `plied` drawing naming it and the unmodified
   * drawing beside it are the same bytes under two filenames. The sweep now
   * drops the unmodified entry for this family instead — see
   * `TYPES_WITH_MODIFIER_NAMED_DEFAULT` — so the ply that used to be the
   * duplicate is the one that carries the drawing, and every parallel
   * document is named for its own ply.
   */
  private strandCounts(rowCount: number): number[] {
    const length = rowCount - MINIMUM_STRANDS + 1;

    return Array.from({ length }, (_value, index) => MINIMUM_STRANDS + index);
  }

  // 🌎 Public Methods

  /**
   * Enumerates every `(type, modifier-or-none, rows, repeatCount)`
   * combination the named-type sweep covers, from each type's own
   * `STRUCTURAL_MINIMUM_ROWS` through the shared `MAXIMUM_VALUE`.
   *
   * Running to `MAXIMUM_VALUE` rather than to a sweep maximum of its own is
   * what makes "every drawing the command line can be asked for is a
   * drawing this repository commits, and a drawing the charter gates" true
   * by construction. It was not always: the sweep stopped at 8 while the
   * command line accepted 12, and issue #507 lived in the four row counts
   * between them — `chain` and `snake` drew self-retracing ink at every one
   * of them, reachable by any user and covered by nothing. Closing the gap
   * here closes it for both callers at once, which is why neither of them
   * passes a range of its own.
   *
   * The `mosaic` permutation half of the sweep does keep a cap, for a reason
   * that does not apply to this half — see
   * `PERMUTATION_ROWS_SWEEP_MAXIMUM`.
   */
  enumerate(): GenerationParameters[] {
    const types = SUPPORTED_TYPES.filter((value): value is MeanderType =>
      this.isMeanderType(value),
    );

    return types.flatMap((type) => this.combinationsForType(type));
  }
}
