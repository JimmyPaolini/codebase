import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated B glyphs of a Code — two unit squares sharing an
 * edge, squares stacked north to south — as a 3×2 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ┌┐
 * ├┤
 * └┘
 * ```
 */
@Injectable()
export class BLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "ed", "a9"];

  // 🔑 Public Fields

  /** Names and explains `bLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated B glyphs — two unit squares sharing an edge, squares stacked north to south.",
    formula: glyphFormula(this.template),
    key: "bLetterCount",
    name: "B Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
