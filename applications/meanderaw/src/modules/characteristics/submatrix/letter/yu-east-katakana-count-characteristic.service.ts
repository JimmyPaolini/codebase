import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ユ (katakana yu) glyphs of a Code — a unit stroke
 * turning down into a base stroke that runs a unit past the turn, turned a
 * quarter anticlockwise so its base faces east — as a 3×2 submatrix scan against
 * the glyph's template, drawn:
 *
 * ```text
 *  ╷
 * ┌┤
 * ╵╵
 * ```
 */
@Injectable()
export class YuEastKatakanaCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ユ (katakana yu) glyphs — a unit stroke turning down into a base stroke that runs a unit past the turn, turned a quarter anticlockwise so its base faces east.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "yuEastKatakanaCount",
      letter: true,
      name: "Yu East Katakana Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4", "6d", "88"];

  // 🔑 Public Fields

  /** Names and explains `yuEastKatakanaCount` for catalogs and inspectors. */
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
