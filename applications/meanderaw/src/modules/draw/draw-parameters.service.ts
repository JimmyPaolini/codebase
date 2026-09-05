import { Injectable } from "@nestjs/common";

import {
  DEFAULT_COMB_IS_UPWARD,
  DEFAULT_RUNG_IS_LEFTWARD,
} from "../branch-motif/branch-motif.constants";
import {
  SUPPORTED_DOT_SHAPES,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { SUPPORTED_SUB_FAMILIES } from "../mosaic-motif/mosaic-motif.constants";

import {
  IncompleteDrawingError,
  MissingModifierParameterError,
  UnsupportedOptionError,
} from "./draw.constants";

import type {
  DotShape,
  GenerationParameters,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { MosaicSubFamily } from "../mosaic-motif/mosaic-motif.types";
import type { DrawCommandOptions } from "./draw.types";

/**
 * Turns what the command line was given into what the generation service
 * takes.
 *
 * It exists because `DrawCommand` has one command's worth of room and two
 * commands' worth of options: nest-commander derives each option's key from
 * its own long flag, so `--modifier` and the parameter it needs
 * (`alternated`'s `--period`, `dot`'s `--shape`, `plied`'s `--strands`,
 * `stagger`'s `--branches`, `rung`'s `--leftward`, `comb`'s `--upward`) are
 * parsed by separate
 * methods that cannot see each other. Recombining them, and narrowing every
 * raw string to the union it belongs to, is the whole of this service — the
 * command keeps only the `@Option` methods nest-commander insists live on
 * it, and delegates each one here.
 *
 * One builder per parameter-carrying modifier, rather than one method that
 * knows all six: {@link modifier} is then a flat dispatch on the name, and
 * each builder holds only its own parameter's absence and the flag that
 * would have supplied it.
 */
@Injectable()
export class DrawParametersService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The `alternated` modifier `--period` describes, refusing the modifier when the flag is absent. */
  private alternatedModifier(period: number | undefined): Modifier {
    if (period === undefined) {
      throw new MissingModifierParameterError("alternated", "--period");
    }

    return { name: "alternated", period };
  }

  /**
   * The `comb` modifier `--upward` describes.
   *
   * Like {@link rungModifier} it cannot refuse an absent flag, and for the
   * same reason: a boolean left off and a boolean passed `false` reach this
   * identically. It takes {@link DEFAULT_COMB_IS_UPWARD}, which is what
   * makes `--modifier comb` draw exactly what no modifier at all draws.
   */
  private combModifier(isUpward: boolean | undefined): Modifier {
    return { isUpward: isUpward ?? DEFAULT_COMB_IS_UPWARD, name: "comb" };
  }

  /** The `dot` modifier `--shape` describes, refusing the modifier when the flag is absent. */
  private dotModifier(shape: DotShape | undefined): Modifier {
    if (shape === undefined) {
      throw new MissingModifierParameterError("dot", "--shape");
    }

    return { name: "dot", shape };
  }

  /** Narrows a raw string to a supported {@link DotShape} without an unchecked assertion. */
  private isDotShape(value: string): value is DotShape {
    return SUPPORTED_DOT_SHAPES.includes(value);
  }

  /** Narrows a raw string to a supported {@link MeanderType} without an unchecked assertion. */
  private isMeanderType(value: string): value is MeanderType {
    return SUPPORTED_TYPES.includes(value);
  }

  /** Narrows a raw string to a supported {@link Modifier} name without an unchecked assertion. */
  private isModifierName(value: string): value is Modifier["name"] {
    return SUPPORTED_MODIFIER_NAMES.includes(value);
  }

  /** Narrows a raw string to a {@link MosaicSubFamily} without an unchecked assertion. */
  private isSubFamily(value: string): value is MosaicSubFamily {
    return SUPPORTED_SUB_FAMILIES.includes(value);
  }

  /** The `plied` modifier `--strands` describes, refusing the modifier when the flag is absent. */
  private pliedModifier(strands: number | undefined): Modifier {
    if (strands === undefined) {
      throw new MissingModifierParameterError("plied", "--strands");
    }

    return { name: "plied", strands };
  }

  /**
   * The `rung` modifier `--leftward` describes.
   *
   * The only builder that cannot refuse an absent flag, and the reason is
   * the flag's own type: commander reports a boolean left off and a boolean
   * passed `false` identically, so "not stated" is not a state this can
   * see. It takes {@link DEFAULT_RUNG_IS_LEFTWARD} instead, which is the
   * direction every `rung` drawn before the flag existed pointed.
   */
  private rungModifier(isLeftward: boolean | undefined): Modifier {
    return {
      isLeftward: isLeftward ?? DEFAULT_RUNG_IS_LEFTWARD,
      name: "rung",
    };
  }

  /** The `stagger` modifier `--branches` describes, refusing the modifier when the flag is absent. */
  private staggerModifier(branches: number | undefined): Modifier {
    if (branches === undefined) {
      throw new MissingModifierParameterError("stagger", "--branches");
    }

    return { branches, name: "stagger" };
  }

  // 🌎 Public Methods

  /** Narrows `--shape` to a {@link DotShape}, rejecting anything outside the supported set. */
  dotShape(value: string): DotShape {
    if (!this.isDotShape(value)) {
      throw new UnsupportedOptionError("shape", value, SUPPORTED_DOT_SHAPES);
    }

    return value;
  }

  /**
   * Builds the {@link Modifier} the parsed options describe, or `undefined`
   * where no `--modifier` was given. A modifier carrying a parameter is
   * refused rather than defaulted when that parameter is absent, since
   * guessing one would silently draw something other than what was asked
   * for — the two booleans excepted, for the reason
   * {@link rungModifier} gives.
   */
  modifier(options: DrawCommandOptions): Modifier | undefined {
    const { modifier } = options;

    if (!modifier) {
      return undefined;
    }

    if (modifier === "alternated") {
      return this.alternatedModifier(options.period);
    }

    if (modifier === "comb") {
      return this.combModifier(options.upward);
    }

    if (modifier === "dot") {
      return this.dotModifier(options.shape);
    }

    if (modifier === "plied") {
      return this.pliedModifier(options.strands);
    }

    if (modifier === "rung") {
      return this.rungModifier(options.leftward);
    }

    if (modifier === "stagger") {
      return this.staggerModifier(options.branches);
    }

    return { name: modifier };
  }

  /** Narrows `--modifier` to a supported {@link Modifier} name, rejecting anything outside the supported set. */
  modifierName(value: string): Modifier["name"] {
    if (!this.isModifierName(value)) {
      throw new UnsupportedOptionError(
        "modifier",
        value,
        SUPPORTED_MODIFIER_NAMES,
      );
    }

    return value;
  }

  /**
   * The parameters for the one drawing `options` asks for.
   *
   * `--type` and `--rows` are optional flags rather than required ones,
   * because passing neither is how the whole sweep is asked for. That makes
   * "one without the other" a state the option parser can no longer rule
   * out, so it is refused here instead.
   */
  single(options: DrawCommandOptions): GenerationParameters {
    const { rows, subFamily, type } = options;

    if (type === undefined || rows === undefined) {
      throw new IncompleteDrawingError();
    }

    const modifier = this.modifier(options);

    return {
      repeatCount: options.repeatCount,
      rows,
      type,
      ...(modifier ? { modifier } : {}),
      ...(subFamily ? { subFamily } : {}),
    };
  }

  /**
   * Narrows `--sub-family` to a {@link MosaicSubFamily}. Note that `dots` is
   * a sub-family and `dot` is a modifier: different things, one letter
   * apart, and only the plural is accepted here.
   */
  subFamily(value: string): MosaicSubFamily {
    if (!this.isSubFamily(value)) {
      throw new UnsupportedOptionError(
        "sub-family",
        value,
        SUPPORTED_SUB_FAMILIES,
      );
    }

    return value;
  }

  /** Narrows `--type` to a supported {@link MeanderType}, rejecting anything outside the supported set. */
  type(value: string): MeanderType {
    if (!this.isMeanderType(value)) {
      throw new UnsupportedOptionError("type", value, SUPPORTED_TYPES);
    }

    return value;
  }
}
