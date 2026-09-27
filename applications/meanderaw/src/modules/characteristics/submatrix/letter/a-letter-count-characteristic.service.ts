import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated A glyphs of a Code — a closed end, a crossbar,
 * and two legs, legs pointing south — as a 3×2 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ┌┐
 * ├┤
 * ╵╵
 * ```
 *
 * Also reads as the Greek Α (alpha).
 */
@Injectable()
export class ALetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated A glyphs — a closed end, a crossbar, and two legs, legs pointing south. Also reads as the Greek Α (alpha).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "aLetterCount",
      letter: true,
      name: "A Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "ed", "88"];

  // 🔑 Public Fields

  /** Names and explains `aLetterCount` for catalogs and inspectors. */
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
