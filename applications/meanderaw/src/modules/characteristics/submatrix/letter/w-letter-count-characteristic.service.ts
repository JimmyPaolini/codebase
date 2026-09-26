import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated W glyphs of a Code — three legs rising from a
 * bar, the middle one half as long, legs pointing north — as a 3×3 submatrix
 * scan against the glyph's template, drawn:
 *
 * ```text
 * ╷ ╷
 * │╷│
 * └┴┘
 * ```
 */
@Injectable()
export class WLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.4", "c4c", "ab9"];

  // 🔑 Public Fields

  /** Names and explains `wLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated W glyphs — three legs rising from a bar, the middle one half as long, legs pointing north.",
    formula: glyphFormula(this.template),
    key: "wLetterCount",
    name: "W Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
