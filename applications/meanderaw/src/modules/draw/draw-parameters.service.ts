import { Injectable } from "@nestjs/common";

import {
  DEFAULT_RUNG_DIRECTION,
  RUNG_ORIENTATIONS_BY_DIRECTION,
  SUPPORTED_RUNG_DIRECTIONS,
} from "../branch-motif/branch-motif.constants";
import {
  PLY_MODIFIER_NAMES,
  SUPPORTED_MODIFIER_NAMES,
  SUPPORTED_TYPES,
} from "../meander-generation/meander-generation.constants";
import { SUPPORTED_SUB_FAMILIES } from "../mosaic-tile/mosaic-tile.constants";
import { SUPPORTED_SERPENTINE_FLIPS } from "../parallel-motif/parallel-motif.constants";

import {
  IncompleteDrawingError,
  MissingModifierParameterError,
  UnsupportedOptionError,
} from "./draw.constants";

import type { RungDirection } from "../branch-motif/branch-motif.types";
import type {
  GenerationParameters,
  MeanderType,
  Modifier,
  PlyModifierName,
  SerpentineFlip,
} from "../meander-generation/meander-generation.types";
import type { MosaicBuildableSubFamily } from "../mosaic-tile/mosaic-tile.types";
import type { DrawCommandOptions } from "./draw.types";

/**
 * Turns what the command line was given into what the generation service
 * takes.
 *
 * It exists because `DrawCommand` has one command's worth of room and two
 * commands' worth of options: nest-commander derives each option's key from
 * its own long flag, so `--modifier` and the parameter it needs
 * (`plied`'s `--strands`, `stagger`'s `--branches`, `rung`'s `--direction`)
 * are parsed by separate
 * methods that cannot see each other. Recombining them, and narrowing every
 * raw string to the union it belongs to, is the whole of this service — the
 * command keeps only the `@Option` methods nest-commander insists live on
 * it, and delegates each one here.
 *
 * One builder per parameter-carrying modifier, rather than one method that
 * knows all five: {@link modifier} is then a flat dispatch on the name, and
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

  /**
   * Narrows a raw string to a {@link RungDirection} without an unchecked
   * assertion.
   *
   * It asks the total map over the union rather than searching
   * {@link SUPPORTED_RUNG_DIRECTIONS}, the way
   * `BranchMotifService.isBranchModifierName` already asks
   * `BRANCH_MODES_BY_MODIFIER_NAME`. That list is typed as the four
   * directions rather than as strings, because the sweep enumerates it — and
   * an array of a literal union cannot be searched for an arbitrary string
   * without one. The refusal below still names the list, so the message a
   * reader sees comes from the same place the sweep reads.
   */
  private isRungDirection(value: string): value is RungDirection {
    return Object.hasOwn(RUNG_ORIENTATIONS_BY_DIRECTION, value);
  }

  /** Narrows a raw string to a {@link SerpentineFlip} without an unchecked assertion. */
  private isSerpentineFlip(value: string): value is SerpentineFlip {
    return SUPPORTED_SERPENTINE_FLIPS.includes(value);
  }

  /** Narrows a raw string to a {@link MosaicBuildableSubFamily} without an unchecked assertion. */
  private isSubFamily(value: string): value is MosaicBuildableSubFamily {
    return SUPPORTED_SUB_FAMILIES.includes(value);
  }

  /**
   * The ply-carrying modifier `--strands` describes, refusing the modifier
   * when the flag is absent.
   *
   * One builder for all three of `parallel`'s modifiers, because the flag
   * they read and the refusal they owe are the same — they differ only in
   * what the strands trace, which is the motif service's business rather
   * than this one's. `serpentine` alone carries more than `--strands`, and
   * {@link serpentineModifier} is where that is added.
   */
  private plyModifier(
    name: PlyModifierName,
    options: DrawCommandOptions,
  ): Modifier {
    const { strands } = options;

    if (strands === undefined) {
      throw new MissingModifierParameterError(name, "--strands");
    }

    return name === "serpentine"
      ? this.serpentineModifier(options, strands)
      : { name, strands };
  }

  /**
   * The `rung` modifier `--direction` describes.
   *
   * The only builder that does not refuse an absent flag, and it is a
   * choice rather than a limitation: a named value can be told absent where
   * the boolean `--leftward` this replaced could not, so `rung` could
   * demand its direction the way `stagger` demands its branch count. It
   * takes {@link DEFAULT_RUNG_DIRECTION} instead, which is the one
   * direction the mode drew before the other three were reachable.
   */
  private rungModifier(direction: RungDirection | undefined): Modifier {
    return { direction: direction ?? DEFAULT_RUNG_DIRECTION, name: "rung" };
  }

  /**
   * The `serpentine` modifier `--flip` and `--offset` describe.
   *
   * Both are optional where every other modifier's parameter is required,
   * and deliberately so: omitting them names the drawing that rotates
   * nothing and turns nothing over, which is the one the corpus already had
   * under the bare `serpentine-strands-N` filename. Demanding them would
   * rename every one of those files for no gain.
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

  /** The `stagger` modifier `--branches` describes, refusing the modifier when the flag is absent. */
  private staggerModifier(branches: number | undefined): Modifier {
    if (branches === undefined) {
      throw new MissingModifierParameterError("stagger", "--branches");
    }

    return { branches, name: "stagger" };
  }

  // 🌎 Public Methods

  /**
   * Builds the {@link Modifier} the parsed options describe
, or `undefined`
   * where no `--modifier` was given. A modifier carrying a parameter is
   * refused rather than defaulted when that parameter is absent, since
   * guessing one would silently draw something other than what was asked
   * for — `rung`'s direction excepted, for the reason
   * {@link rungModifier} gives.
   */
  modifier(options: DrawCommandOptions): Modifier | undefined {
    const { modifier } = options;

    if (!modifier) {
      return undefined;
    }

    if (this.isPlyModifierName(modifier)) {
      return this.plyModifier(modifier, options);
    }

    if (modifier === "rung") {
      return this.rungModifier(options.direction);
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

  /** Narrows `--direction`, rejecting any value outside the supported set. Used only with `--modifier rung`. */
  rungDirection(value: string): RungDirection {
    if (!this.isRungDirection(value)) {
      throw new UnsupportedOptionError(
        "direction",
        value,
        SUPPORTED_RUNG_DIRECTIONS,
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
   * Narrows `--sub-family` to a {@link MosaicBuildableSubFamily}, which for
   * `mosaic` is the only way to name a drawing: the family draws no repeat
   * unit of its own, so `--type mosaic` on its own is refused rather than
   * defaulted — see `MissingSubFamilyError`.
   */
  subFamily(value: string): MosaicBuildableSubFamily {
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
