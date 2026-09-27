import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ㅛ (hangul yo) glyphs of a Code — two unit strokes
 * rising from the middle two points of a three-unit base — as a 2×4 submatrix
 * scan against the glyph's template, drawn:
 *
 * ```text
 *  ╷╷
 * ╶┴┴╴
 * ```
 */
@Injectable()
export class YoHangulCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ㅛ (hangul yo) glyphs — two unit strokes rising from the middle two points of a three-unit base.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "yoHangulCount",
      letter: true,
      name: "Yo Hangul Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".44.", "2bb1"];

  // 🔑 Public Fields

  /** Names and explains `yoHangulCount` for catalogs and inspectors. */
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
