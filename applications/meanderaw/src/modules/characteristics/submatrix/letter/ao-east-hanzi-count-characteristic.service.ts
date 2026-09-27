import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated 凹 (hanzi ao) glyphs of a Code — the outline of a
 * three-unit bar with a unit notch cut into the middle of its top, turned a
 * quarter anticlockwise so its base faces east — as a 4×3 submatrix scan against
 * the glyph's template, drawn:
 *
 * ```text
 * ┌─┐
 * └┐│
 * ┌┘│
 * └─┘
 * ```
 */
@Injectable()
export class AoEastHanziCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated 凹 (hanzi ao) glyphs — the outline of a three-unit bar with a unit notch cut into the middle of its top, turned a quarter anticlockwise so its base faces east.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "aoEastHanziCount",
      name: "Ao East Hanzi Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["635", "a5c", "69c", "a39"];

  // 🔑 Public Fields

  /** Names and explains `aoEastHanziCount` for catalogs and inspectors. */
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
