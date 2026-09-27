import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated H glyphs of a Code — two parallel posts joined
 * at their middles, posts vertical — as a 3×2 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╷╷
 * ├┤
 * ╵╵
 * ```
 *
 * Also reads as the Greek Η (eta) and the hangul ㅐ (ae).
 */
@Injectable()
export class HLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated H glyphs — two parallel posts joined at their middles, posts vertical. Also reads as the Greek Η (eta) and the hangul ㅐ (ae).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "hLetterCount",
      letter: true,
      name: "H Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["44", "ed", "88"];

  // 🔑 Public Fields

  /** Names and explains `hLetterCount` for catalogs and inspectors. */
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
