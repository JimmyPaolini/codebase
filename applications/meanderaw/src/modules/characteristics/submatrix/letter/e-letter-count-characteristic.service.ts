import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated E glyphs of a Code — a spine with three equal
 * prongs, prongs pointing east — as a 3×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ┌╴
 * ├╴
 * └╴
 * ```
 *
 * Also reads as the hangul ㅌ (tieut).
 */
@Injectable()
export class ELetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated E glyphs — a spine with three equal prongs, prongs pointing east. Also reads as the hangul ㅌ (tieut).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "eLetterCount",
      name: "E Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "e1", "a1"];

  // 🔑 Public Fields

  /** Names and explains `eLetterCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number>;

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the pieces of ink drawn exactly as the template. */
  public compute(context: CharacteristicContext): number {
    return this.submatrixUtilitiesService.countIsolatedGlyphs(
      context.matrix,
      this.template,
    );
  }
}
