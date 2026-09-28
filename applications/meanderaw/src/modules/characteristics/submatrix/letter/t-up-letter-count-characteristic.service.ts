import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated T glyphs of a Code — a bar with a unit stem from
 * its middle, stem pointing north — as a 2×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 *  ╷
 * ╶┴╴
 * ```
 */
@Injectable()
export class TUpLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", "2b1"];

  // 🔑 Public Fields

  /** Names and explains `tUpLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated T glyphs — a bar with a unit stem from its middle, stem pointing north.",
    formula: glyphFormula(this.template),
    key: "tUpLetterCount",
    name: "T Up Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
