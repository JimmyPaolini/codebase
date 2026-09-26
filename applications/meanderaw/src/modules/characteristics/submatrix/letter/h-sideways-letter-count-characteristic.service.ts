import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated H glyphs of a Code — two parallel posts joined
 * at their middles, posts horizontal — as a 2×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╶┬╴
 * ╶┴╴
 * ```
 */
@Injectable()
export class HSidewaysLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["271", "2b1"];

  // 🔑 Public Fields

  /** Names and explains `hSidewaysLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated H glyphs — two parallel posts joined at their middles, posts horizontal.",
    formula: glyphFormula(this.template),
    key: "hSidewaysLetterCount",
    name: "H Sideways Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
