import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ㅍ (hangul pieup) glyphs of a Code — a unit square
 * whose top and bottom strokes run a unit past both sides, turned on its side —
 * as a 4×2 submatrix scan against the glyph's template, drawn:
 *
 * ```text
 * ╷╷
 * ├┤
 * ├┤
 * ╵╵
 * ```
 */
@Injectable()
export class PieupSidewaysHangulCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ㅍ (hangul pieup) glyphs — a unit square whose top and bottom strokes run a unit past both sides, turned on its side.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "pieupSidewaysHangulCount",
      name: "Pieup Sideways Hangul Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["44", "ed", "ed", "88"];

  // 🔑 Public Fields

  /** Names and explains `pieupSidewaysHangulCount` for catalogs and inspectors. */
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
