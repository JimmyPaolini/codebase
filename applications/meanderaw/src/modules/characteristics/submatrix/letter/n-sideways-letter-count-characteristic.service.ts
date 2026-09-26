import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated N glyphs of a Code — two posts joined by a
 * stepped diagonal, posts horizontal — as a 3×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╶─┐
 * ┌─┘
 * └─╴
 * ```
 */
@Injectable()
export class NSidewaysLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["235", "639", "a31"];

  // 🔑 Public Fields

  /** Names and explains `nSidewaysLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated N glyphs — two posts joined by a stepped diagonal, posts horizontal.",
    formula: glyphFormula(this.template),
    key: "nSidewaysLetterCount",
    name: "N Sideways Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
