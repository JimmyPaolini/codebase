import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated 王 (hanzi wang) glyphs of a Code — three two-unit
 * bars threaded on one vertical stroke — as a 3×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╶┬╴
 * ╶┼╴
 * ╶┴╴
 * ```
 */
@Injectable()
export class WangHanziCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated 王 (hanzi wang) glyphs — three two-unit bars threaded on one vertical stroke.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "wangHanziCount",
      letter: true,
      name: "Wang Hanzi Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["271", "2f1", "2b1"];

  // 🔑 Public Fields

  /** Names and explains `wangHanziCount` for catalogs and inspectors. */
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
