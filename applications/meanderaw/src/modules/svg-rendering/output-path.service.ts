import { Injectable } from "@nestjs/common";

import {
  FILENAME_ADDRESS_CONVENTION,
  UNMODIFIED_VARIANT_NAME,
} from "./svg-rendering.constants";

import type { LatticeAddress } from "../lattice-identification/lattice-identification.types";
import type {
  GenerationParameters,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";

/**
 * Builds the path one set of generation parameters is written to, relative
 * to the output directory and always POSIX-separated so the same string
 * serves both `fs` and the index page's hyperlinks.
 *
 * The attributes are split across the path rather than crammed into one
 * name: the family and the row count are directories, and only what is left
 * — the variant, the repeat count, and its lattice address where one is
 * given — is the filename. A directory listing therefore reads as the
 * parameter space it enumerates, and no two distinct parameter sets can
 * still share a path.
 *
 * Both of `DrawCommand`'s modes build their paths here — the sweep and the
 * single drawing alike — so a hand-named drawing lands exactly where the
 * sweep would have put it, and `DrawPermutationsService` composes its own
 * tile directories on top of {@link familyDirectory} for the same reason.
 *
 * {@link build}'s `address` is a caller-supplied parameter rather than
 * something recovered here, because reaching one needs the rendered
 * document and the family's own repeat unit — `DrawCommand.renderParameters`
 * is where both already sit side by side. Omitting it leaves a filename
 * exactly as it was before this feature existed, which is what every
 * `mosaic` caller does: that family already files its committed drawings
 * under a full address through `DrawPermutationsService`, spelled directly
 * into the filename rather than appended here, and `MotifPitchService` has
 * no motif to probe for a pitch of its own.
 */
@Injectable()
export class OutputPathService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * What one family's lattice address is called in a filename: the literal
   * address under `full-address`, or the row-and-span shape alone under
   * `shape-only` — `-12r42c`, with no hexadecimal identifier, for a family
   * whose worst-case address would breach the 255-byte limit on its own.
   *
   * `FILENAME_ADDRESS_CONVENTION` decides which, per family rather than per
   * drawing, so nothing here chooses a convention on the fly.
   */
  private addressSuffix(type: MeanderType, address: LatticeAddress): string {
    return FILENAME_ADDRESS_CONVENTION[type] === "full-address"
      ? `-${address.address}`
      : `-${address.rows}r${address.span}c`;
  }

  /**
   * The leaf filename: the variant that was drawn, then the repeat count it
   * was drawn at.
   *
   * The variant is the sub-family's name, or the modifier's kebab-case slug,
   * or {@link UNMODIFIED_VARIANT_NAME} when there is neither. Never a
   * sub-family and a modifier together: the generation service rejects that
   * pairing, since either one alone decides which repeat unit is drawn.
   *
   * `diamond` and the `split` modifier used to draw the same shape under
   * two names and land in two files. `split` is gone, so the sub-family is
   * the only name that shape has here now.
   */
  private fileName(parameters: GenerationParameters): string {
    const { modifier, repeatCount, subFamily } = parameters;
    const suffix = `${repeatCount}-repeats.svg`;

    if (subFamily) {
      return `${subFamily}-${suffix}`;
    }

    if (!modifier) {
      return `${UNMODIFIED_VARIANT_NAME}-${suffix}`;
    }

    return `${this.modifierSlug(modifier)}-${suffix}`;
  }

  /**
   * What one modifier is called in a filename: its own name, and the
   * parameter it carries where it carries one.
   *
   * A parameter-carrying modifier has to say its parameter here, or the
   * sweep's own values would collide on one path and `CollidingPathsError`
   * would fire rather than a drawing being written. Two spellings, and which
   * one a modifier takes is decided by whether the value reads on its own:
   * `rung`'s direction is a word, so it
   * follows the name unadorned, while a bare number would say nothing — so
   * `stagger` and the ply-carrying modifiers name their
   * parameter before it. The last of those are spelled by
   * {@link plySlug}, since all three spell it the same way and one of them
   * carries a second parameter besides.
   */
  private modifierSlug(modifier: Modifier): string {
    if (modifier.name === "rung") {
      return `rung-${modifier.isLeftward ? "leftward" : "rightward"}`;
    }

    if (modifier.name === "stagger") {
      return `stagger-branches-${modifier.branches}`;
    }

    if ("strands" in modifier) {
      return this.plySlug(modifier);
    }

    return modifier.name;
  }

  /**
   * What one ply-carrying modifier is called in a filename.
   *
   * All three name their strand count the same way. `serpentine` is the one
   * that carries more than one parameter, and it names each in turn —
   * `serpentine-strands-4-flip-alternating-offset-2`. Both of its extra axes
   * are omitted at their defaults, which is what keeps the drawing that
   * rotates nothing and turns nothing over on the same bare
   * `serpentine-strands-N` name it had before either axis existed.
   */
  private plySlug(modifier: Extract<Modifier, { strands: number }>): string {
    const suffix =
      modifier.name === "serpentine"
        ? `${modifier.flip === undefined ? "" : `-flip-${modifier.flip}`}${
            modifier.offset === undefined ? "" : `-offset-${modifier.offset}`
          }`
        : "";

    return `${modifier.name}-strands-${modifier.strands}${suffix}`;
  }

  // 🌎 Public Methods

  /**
   * The path one drawing is written to, relative to the output directory.
   *
   * `address` is optional and appends nothing when it is left out — the
   * shape every path had before this feature existed, which is what every
   * `mosaic` caller keeps. Given one, it is appended to the filename ahead
   * of the extension, in whichever of the two spellings
   * {@link addressSuffix} reads off `FILENAME_ADDRESS_CONVENTION` for
   * `parameters.type`.
   */
  build(parameters: GenerationParameters, address?: LatticeAddress): string {
    const directory = this.familyDirectory(parameters.type, parameters.rows);
    const fileName = this.fileName(parameters);

    if (!address) {
      return `${directory}/${fileName}`;
    }

    const suffix = this.addressSuffix(parameters.type, address);
    const addressedFileName = fileName.replace(/\.svg$/u, `${suffix}.svg`);

    return `${directory}/${addressedFileName}`;
  }

  /**
   * The directory every document of one family at one row count is written
   * to, relative to the output directory. `DrawPermutationsService` nests
   * its enumerated tiles beneath this rather than beside it, so a row
   * count's named drawings and its thousands of tiles stay in one place.
   */
  familyDirectory(type: MeanderType, rows: number): string {
    return `${type}/${rows}-rows`;
  }
}
