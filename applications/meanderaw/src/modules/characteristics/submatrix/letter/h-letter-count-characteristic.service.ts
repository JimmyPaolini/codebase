import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated H glyphs of a Code — two parallel posts joined
 * at their middles, posts vertical — as a 3×2 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╷╷
 * ├┤
 * ╵╵
 * ```
 */
@Injectable()
export class HLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["44", "ed", "88"];

  // 🔑 Public Fields

  /** Names and explains `hLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated H glyphs — two parallel posts joined at their middles, posts vertical.",
    formula: glyphFormula(this.template),
    key: "hLetterCount",
    name: "H Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
