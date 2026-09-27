import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated I glyphs of a Code — a single straight edge,
 * drawn horizontally — as a 1×2 submatrix scan against the glyph's template,
 * drawn:
 *
 * ```text
 * ╶╴
 * ```
 *
 * Also reads as the hangul ㅡ (eu) and the hanzi 一 (yi).
 */
@Injectable()
export class ISidewaysLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated I glyphs — a single straight edge, drawn horizontally. Also reads as the hangul ㅡ (eu) and the hanzi 一 (yi).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "iSidewaysLetterCount",
      letter: true,
      name: "I Sideways Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["21"];

  // 🔑 Public Fields

  /** Names and explains `iSidewaysLetterCount` for catalogs and inspectors. */
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
