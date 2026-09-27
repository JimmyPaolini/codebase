import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ㅠ (hangul yu) glyphs of a Code — two unit strokes
 * dropping from the middle two points of a three-unit bar — as a 2×4 submatrix
 * scan against the glyph's template, drawn:
 *
 * ```text
 * ╶┬┬╴
 *  ╵╵
 * ```
 */
@Injectable()
export class YuHangulCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ㅠ (hangul yu) glyphs — two unit strokes dropping from the middle two points of a three-unit bar.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "yuHangulCount",
      name: "Yu Hangul Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["2771", ".88."];

  // 🔑 Public Fields

  /** Names and explains `yuHangulCount` for catalogs and inspectors. */
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
