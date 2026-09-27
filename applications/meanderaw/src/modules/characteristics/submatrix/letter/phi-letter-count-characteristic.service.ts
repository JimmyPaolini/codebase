import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated Φ (Greek phi) glyphs of a Code — a two-unit-wide,
 * unit-tall box threaded through its middle by a vertical stroke that runs a
 * unit past its top and bottom — as a 4×3 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 *  ╷
 * ┌┼┐
 * └┼┘
 *  ╵
 * ```
 */
@Injectable()
export class PhiLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated Φ (Greek phi) glyphs — a two-unit-wide, unit-tall box threaded through its middle by a vertical stroke that runs a unit past its top and bottom. Also reads as the hanzi 中 (zhong).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "phiLetterCount",
      name: "Phi Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", "6f5", "af9", ".8."];

  // 🔑 Public Fields

  /** Names and explains `phiLetterCount` for catalogs and inspectors. */
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
