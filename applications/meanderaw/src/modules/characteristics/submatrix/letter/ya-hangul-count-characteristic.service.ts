import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ㅑ (hangul ya) glyphs of a Code — two unit strokes
 * reaching east from the middle two points of a three-unit stem — as a 4×2
 * submatrix scan against the glyph's template, drawn:
 *
 * ```text
 * ╷
 * ├╴
 * ├╴
 * ╵
 * ```
 */
@Injectable()
export class YaHangulCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ㅑ (hangul ya) glyphs — two unit strokes reaching east from the middle two points of a three-unit stem.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "yaHangulCount",
      name: "Ya Hangul Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "e1", "e1", "8."];

  // 🔑 Public Fields

  /** Names and explains `yaHangulCount` for catalogs and inspectors. */
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
