import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated Z glyphs of a Code — three bars joined into a
 * serpentine, mirroring S, bars horizontal — as a 3×2 submatrix scan against
 * the glyph's template, drawn:
 *
 * ```text
 * ╶┐
 * ┌┘
 * └╴
 * ```
 *
 * Also reads as the Greek Ζ (zeta) and the hangul ㄹ (rieul).
 */
@Injectable()
export class ZLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated Z glyphs — three bars joined into a serpentine, mirroring S, bars horizontal. Also reads as the Greek Ζ (zeta) and the hangul ㄹ (rieul).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "zLetterCount",
      letter: true,
      name: "Z Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["25", "69", "a1"];

  // 🔑 Public Fields

  /** Names and explains `zLetterCount` for catalogs and inspectors. */
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
