import { Injectable } from "@nestjs/common";

import {
  COMPATIBLE_MODIFIERS,
  DEFAULT_REPEAT_COUNT,
  SPIN_CYCLE_LENGTH,
  SPIN_FAMILY_MODIFIER_NAMES,
  STRUCTURAL_MINIMUM_ROWS,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";

import {
  ALTERNATED_SWEEP_PERIODS,
  DOT_SWEEP_SHAPES,
  PLIED_SWEEP_STRAND_COUNTS,
  ROWS_SWEEP_MAXIMUM,
} from "./draw.constants";

import type {
  GenerationParameters,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";

/**
 * Enumerates the named-type half of the sweep: every implemented type,
 * crossed with every modifier `COMPATIBLE_MODIFIERS` lists for it plus "no
 * modifier", crossed with every row count from that type's own
 * `STRUCTURAL_MINIMUM_ROWS` through `ROWS_SWEEP_MAXIMUM`. `alternated` and
 * `dot` each expand to the representative values `start.constants.ts` names
 * rather than their full range, and `repeatCount` is
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

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Enumerates every combination for a single type: every swept row count crossed with every swept modifier. */
  private combinationsForType(type: MeanderType): GenerationParameters[] {
    const rows = this.rowsSweep(type);
    const modifiers = this.modifiersForType(type);

    return rows.flatMap((rowCount) =>
      modifiers.map((modifier) => ({
        repeatCount: this.repeatCountFor(modifier),
        rows: rowCount,
        type,
        ...(modifier ? { modifier } : {}),
      })),
    );
  }

  /** Expands one modifier name into every representative {@link Modifier} value the sweep covers. */
  private expandModifierName(name: Modifier["name"]): Modifier[] {
    if (name === "alternated") {
      return ALTERNATED_SWEEP_PERIODS.map((period) => ({ name, period }));
    }

    if (name === "dot") {
      return DOT_SWEEP_SHAPES.map((shape) => ({ name, shape }));
    }

    if (name === "plied") {
      return PLIED_SWEEP_STRAND_COUNTS.map((strands) => ({ name, strands }));
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

  /** Every modifier the sweep covers for `type`: `undefined` (no modifier) plus every representative value of each compatible modifier. */
  private modifiersForType(type: MeanderType): (Modifier | undefined)[] {
    const modifierNames = COMPATIBLE_MODIFIERS[type].filter(
      (value): value is Modifier["name"] => this.isModifierName(value),
    );

    return [
      undefined,
      ...modifierNames.flatMap((name) => this.expandModifierName(name)),
    ];
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

  /** Every `rows` value the sweep covers for `type`: its own structural minimum through `ROWS_SWEEP_MAXIMUM`. */
  private rowsSweep(type: MeanderType): number[] {
    const minimum = STRUCTURAL_MINIMUM_ROWS[type];
    const length = ROWS_SWEEP_MAXIMUM - minimum + 1;

    return Array.from({ length }, (_value, index) => minimum + index);
  }

  // 🌎 Public Methods

  /** Enumerates every `(type, modifier-or-none, rows, repeatCount)` combination the named-type sweep covers. */
  enumerate(): GenerationParameters[] {
    const types = SUPPORTED_TYPES.filter((value): value is MeanderType =>
      this.isMeanderType(value),
    );

    return types.flatMap((type) => this.combinationsForType(type));
  }
}
