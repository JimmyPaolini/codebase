import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated Y glyphs of a Code — two arms joining into a
 * unit stem, stem pointing south — as a 3×3 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ╷ ╷
 * └┬┘
 *  ╵
 * ```
 */
@Injectable()
export class YLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.4", "a79", ".8."];

  // 🔑 Public Fields

  /** Names and explains `yLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated Y glyphs — two arms joining into a unit stem, stem pointing south.",
    formula: glyphFormula(this.template),
    key: "yLetterCount",
    name: "Y Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
