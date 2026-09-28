import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated U glyphs of a Code — a unit square missing one
 * side, open to the south — as a 2×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ┌┐
 * ╵╵
 * ```
 */
@Injectable()
export class UInvertedLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "88"];

  // 🔑 Public Fields

  /** Names and explains `uInvertedLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated U glyphs — a unit square missing one side, open to the south.",
    formula: glyphFormula(this.template),
    key: "uInvertedLetterCount",
    name: "U Inverted Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
