import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated 土 (hanzi tu, soil or earth) glyphs of a Code — two
 * two-unit bars threaded on a vertical stroke that runs a unit above the upper
 * bar and stops at the lower — as a 3×3 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 *  ╷
 * ╶┼╴
 * ╶┴╴
 * ```
 */
@Injectable()
export class TuSoilHanziCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated 土 (hanzi tu, soil or earth) glyphs — two two-unit bars threaded on a vertical stroke that runs a unit above the upper bar and stops at the lower. Also reads as the hanzi 士 (shi).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "tuSoilHanziCount",
      letter: true,
      name: "Tu Soil Hanzi Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", "2f1", "2b1"];

  // 🔑 Public Fields

  /** Names and explains `tuSoilHanziCount` for catalogs and inspectors. */
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
