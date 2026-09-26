import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated M glyphs of a Code — three legs hanging from a
 * bar, the middle one half as long, legs pointing west — as a 3×3 submatrix
 * scan against the glyph's template, drawn:
 *
 * ```text
 * ╶─┐
 *  ╶┤
 * ╶─┘
 * ```
 */
@Injectable()
export class MWestLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["235", ".2d", "239"];

  // 🔑 Public Fields

  /** Names and explains `mWestLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated M glyphs — three legs hanging from a bar, the middle one half as long, legs pointing west.",
    formula: glyphFormula(this.template),
    key: "mWestLetterCount",
    name: "M West Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
