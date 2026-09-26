import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated L glyphs of a Code — two unit strokes meeting at
 * a corner, foot pointing south — as a 2×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ┌╴
 * ╵
 * ```
 */
@Injectable()
export class LDownLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "8."];

  // 🔑 Public Fields

  /** Names and explains `lDownLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated L glyphs — two unit strokes meeting at a corner, foot pointing south.",
    formula: glyphFormula(this.template),
    key: "lDownLetterCount",
    name: "L Down Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
