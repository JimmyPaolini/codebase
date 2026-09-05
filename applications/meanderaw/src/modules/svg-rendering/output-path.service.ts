import { Injectable } from "@nestjs/common";

import { UNMODIFIED_VARIANT_NAME } from "./svg-rendering.constants";

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
 * — the variant and the repeat count — is the filename. A directory listing
 * therefore reads as the parameter space it enumerates, and no two distinct
 * parameter sets can still share a path.
 *
 * Both of `DrawCommand`'s modes build their paths here — the sweep and the
 * single drawing alike — so a hand-named drawing lands exactly where the
 * sweep would have put it, and `DrawPermutationsService` composes its own
 * tile directories on top of {@link familyDirectory} for the same reason.
 */
@Injectable()
export class OutputPathService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * The leaf filename: the variant that was drawn, then the repeat count it
   * was drawn at.
   *
   * The variant is the sub-family's name, or the modifier's kebab-case slug,
   * or {@link UNMODIFIED_VARIANT_NAME} when there is neither. Never a
   * sub-family and a modifier together: the generation service rejects that
   * pairing, since either one alone decides which repeat unit is drawn.
   *
   * `diamond` and `split` draw the same shape under two names, and both
   * reach here — one as a sub-family, one as a modifier — so they still land
   * in two files rather than overwriting each other.
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
   * `dot`'s shapes and `comb`'s and `rung`'s directions are words, so they
   * follow the name unadorned, while a bare number would say nothing — so
   * `alternated`, `stagger`, and the ply-carrying modifiers name their
   * parameter before it. The last of those are spelled by
   * {@link plySlug}, since all three spell it the same way and one of them
   * carries a second parameter besides.
   */
  private modifierSlug(modifier: Modifier): string {
    if (modifier.name === "alternated") {
      return `alternated-period-${modifier.period}`;
    }

    if (modifier.name === "comb") {
      return `comb-${modifier.isUpward ? "upward" : "downward"}`;
    }

    if (modifier.name === "dot") {
      return `dot-${modifier.shape}`;
    }

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

  /** The path one drawing is written to, relative to the output directory. */
  build(parameters: GenerationParameters): string {
    const directory = this.familyDirectory(parameters.type, parameters.rows);

    return `${directory}/${this.fileName(parameters)}`;
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
