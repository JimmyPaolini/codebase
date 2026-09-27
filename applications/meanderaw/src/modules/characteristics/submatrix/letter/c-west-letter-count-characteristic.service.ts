import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated C glyphs of a Code — a unit square missing one
 * side, open to the west — as a 2×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ╶┐
 * ╶┘
 * ```
 *
 * Also reads as the katakana コ (ko) and the Hebrew כ (kaf).
 */
@Injectable()
export class CWestLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated C glyphs — a unit square missing one side, open to the west. Also reads as the katakana コ (ko) and the Hebrew כ (kaf).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "cWestLetterCount",
      letter: true,
      name: "C West Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["25", "29"];

  // 🔑 Public Fields

  /** Names and explains `cWestLetterCount` for catalogs and inspectors. */
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
