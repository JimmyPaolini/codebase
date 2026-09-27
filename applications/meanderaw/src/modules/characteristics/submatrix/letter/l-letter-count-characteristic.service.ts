import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated L glyphs of a Code — two unit strokes meeting at
 * a corner, foot pointing east — as a 2×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ╷
 * └╴
 * ```
 *
 * Also reads as the hangul ㄴ (nieun).
 */
@Injectable()
export class LLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated L glyphs — two unit strokes meeting at a corner, foot pointing east. Also reads as the hangul ㄴ (nieun).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "lLetterCount",
      letter: true,
      name: "L Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "a1"];

  // 🔑 Public Fields

  /** Names and explains `lLetterCount` for catalogs and inspectors. */
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
