import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ㅋ (hangul kieuk) glyphs of a Code — two unit
 * strokes reaching west from a two-unit stem, one from its top and one from its
 * middle, turned upside down — as a 3×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ╷
 * ├╴
 * └╴
 * ```
 */
@Injectable()
export class KieukInvertedHangulCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ㅋ (hangul kieuk) glyphs — two unit strokes reaching west from a two-unit stem, one from its top and one from its middle, turned upside down.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "kieukInvertedHangulCount",
      name: "Kieuk Inverted Hangul Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "e1", "a1"];

  // 🔑 Public Fields

  /** Names and explains `kieukInvertedHangulCount` for catalogs and inspectors. */
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
