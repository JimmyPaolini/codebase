import { Injectable } from "@nestjs/common";

import { countIsolatedGlyphs, glyphFormula } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated Z glyphs of a Code — three bars joined into a
 * serpentine, mirroring S, bars horizontal — as a 3×2 submatrix scan against
 * the glyph's template, drawn:
 *
 * ```text
 * ╶┐
 * ┌┘
 * └╴
 * ```
 */
@Injectable()
export class ZLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["25", "69", "a1"];

  // 🔑 Public Fields

  /** Names and explains `zLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of minimal isolated Z glyphs — three bars joined into a serpentine, mirroring S, bars horizontal.",
    formula: glyphFormula(this.template),
    key: "zLetterCount",
    name: "Z Letter Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return countIsolatedGlyphs(context.matrix, this.template);
  }
}
