import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated T glyphs of a Code — a bar with a unit stem from
 * its middle, stem pointing south — as a 2×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╶┬╴
 *  ╵
 * ```
 *
 * Also reads as the hangul ㅜ (u).
 */
@Injectable()
export class TLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated T glyphs — a bar with a unit stem from its middle, stem pointing south. Also reads as the hangul ㅜ (u).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "tLetterCount",
      name: "T Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["271", ".8."];

  // 🔑 Public Fields

  /** Names and explains `tLetterCount` for catalogs and inspectors. */
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
