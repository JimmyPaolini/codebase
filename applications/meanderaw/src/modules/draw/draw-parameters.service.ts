import { Injectable } from "@nestjs/common";

import {
  PLY_MODIFIER_NAMES,
  SUPPORTED_DOT_SHAPES,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { SUPPORTED_SUB_FAMILIES } from "../mosaic-motif/mosaic-motif.constants";
import { SUPPORTED_SERPENTINE_FLIPS } from "../parallel-motif/parallel-motif.constants";

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
  PlyModifierName,
  SerpentineFlip,
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
 * (`alternated`'s `--period`, `dot`'s `--shape`, `plied`'s `--strands`) are
 * parsed by separate methods that cannot see each other. Recombining them,
 * and narrowing every raw string to the union it belongs to, is the whole of
 * this service — the command keeps only the `@Option` methods nest-commander
 * insists live on it, and delegates each one here.
 */
@Injectable()
export class DrawParametersService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Narrows a raw string to a supported {@link DotShape} without an unchecked assertion. */
  private isDotShape(value: string): value is DotShape {
    return SUPPORTED_DOT_SHAPES.includes(value);
  }

  /** Narrows a raw string to a supported {@link MeanderType} without an unchecked assertion. */
  private isMeanderType(value: string): value is MeanderType {
    return SUPPORTED_TYPES.includes(value);
  }

  /** Narrows a raw string to a supported {@link Modifier} name, so the option parser can reject an unknown one by name. */
  private isModifierName(value: string): value is Modifier["name"] {
    return SUPPORTED_MODIFIER_NAMES.includes(value);
  }

  /** Narrows a modifier name to one of the ply-carrying ones, so `--strands` is demanded for exactly those. */
  private isPlyModifierName(value: Modifier["name"]): value is PlyModifierName {
    return PLY_MODIFIER_NAMES.includes(value);
  }

  /** Narrows a raw string to a {@link SerpentineFlip} without an unchecked assertion. */
  private isSerpentineFlip(value: string): value is SerpentineFlip {
    return SUPPORTED_SERPENTINE_FLIPS.includes(value);
  }

  /** Narrows a raw string to a {@link MosaicSubFamily} without an unchecked assertion. */
  private isSubFamily(value: string): value is MosaicSubFamily {
    return SUPPORTED_SUB_FAMILIES.includes(value);
  }

  /**
   * Builds the `serpentine` {@link Modifier} the parsed options describe.
   *
   * Its two extra axes are optional where every other modifier's parameter
   * is required, and deliberately so: omitting them names the drawing that
   * rotates nothing and turns nothing over, which is the one the corpus
   * already had under the bare `serpentine-strands-N` filename. Demanding
   * them would rename every one of those files for no gain.
   */
  private serpentineModifier(
    options: DrawCommandOptions,
    strands: number,
  ): Modifier {
    const { flip, offset } = options;

    return {
      name: "serpentine",
      strands,
      ...(flip === undefined ? {} : { flip }),
      ...(offset === undefined ? {} : { offset }),
    };
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
   * for.
   */
  modifier(options: DrawCommandOptions): Modifier | undefined {
    const { modifier, period, shape, strands } = options;

    if (!modifier) {
      return undefined;
    }

    if (modifier === "alternated") {
      if (period === undefined) {
        throw new MissingModifierParameterError(modifier, "--period");
      }

      return { name: modifier, period };
    }

    if (modifier === "dot") {
      if (shape === undefined) {
        throw new MissingModifierParameterError(modifier, "--shape");
      }

      return { name: modifier, shape };
    }

    if (this.isPlyModifierName(modifier)) {
      if (strands === undefined) {
        throw new MissingModifierParameterError(modifier, "--strands");
      }

      return modifier === "serpentine"
        ? this.serpentineModifier(options, strands)
        : { name: modifier, strands };
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

  /** Narrows `--flip`, rejecting any value outside the supported set. Used only with `--modifier serpentine`. */
  serpentineFlip(value: string): SerpentineFlip {
    if (!this.isSerpentineFlip(value)) {
      throw new UnsupportedOptionError(
        "flip",
        value,
        SUPPORTED_SERPENTINE_FLIPS,
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
