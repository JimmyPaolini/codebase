import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated A glyphs of a Code — a closed end, a crossbar,
 * and two legs, legs pointing north — as a 3×2 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╷╷
 * ├┤
 * └┘
 * ```
 */
@Injectable()
export class AInvertedLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["44", "ed", "a9"];

  // 🔑 Public Fields

  /** Names and explains `aInvertedLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated A glyphs — a closed end, a crossbar, and two legs, legs pointing north.",
    formula: glyphFormula(this.template),
    key: "aInvertedLetterCount",
    name: "A Inverted Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
