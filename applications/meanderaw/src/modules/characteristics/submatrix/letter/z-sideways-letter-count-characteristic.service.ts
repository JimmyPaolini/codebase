import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated Z glyphs of a Code — three bars joined into a
 * serpentine, mirroring S, bars vertical — as a 2×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ┌┐╷
 * ╵└┘
 * ```
 */
@Injectable()
export class ZSidewaysLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["654", "8a9"];

  // 🔑 Public Fields

  /** Names and explains `zSidewaysLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated Z glyphs — three bars joined into a serpentine, mirroring S, bars vertical.",
    formula: glyphFormula(this.template),
    key: "zSidewaysLetterCount",
    name: "Z Sideways Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
