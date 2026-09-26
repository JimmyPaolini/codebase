import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated E glyphs of a Code — a spine with three equal
 * prongs, prongs pointing north — as a 2×3 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ╷╷╷
 * └┴┘
 * ```
 */
@Injectable()
export class EUpLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["444", "ab9"];

  // 🔑 Public Fields

  /** Names and explains `eUpLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated E glyphs — a spine with three equal prongs, prongs pointing north.",
    formula: glyphFormula(this.template),
    key: "eUpLetterCount",
    name: "E Up Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
