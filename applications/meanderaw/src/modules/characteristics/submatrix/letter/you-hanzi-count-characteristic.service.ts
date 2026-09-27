import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated 由 (hanzi you) glyphs of a Code — a two-by-two
 * grid of unit squares whose middle vertical stroke runs a unit above its top —
 * as a 4×3 submatrix scan against the glyph's template, drawn:
 *
 * ```text
 *  ╷
 * ┌┼┐
 * ├┼┤
 * └┴┘
 * ```
 */
@Injectable()
export class YouHanziCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated 由 (hanzi you) glyphs — a two-by-two grid of unit squares whose middle vertical stroke runs a unit above its top.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "youHanziCount",
      name: "You Hanzi Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", "6f5", "efd", "ab9"];

  // 🔑 Public Fields

  /** Names and explains `youHanziCount` for catalogs and inspectors. */
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
