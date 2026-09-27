import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated A glyphs of a Code — a closed end, a crossbar,
 * and two legs, legs pointing west — as a 2×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╶┬┐
 * ╶┴┘
 * ```
 */
@Injectable()
export class AWestLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated A glyphs — a closed end, a crossbar, and two legs, legs pointing west.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "aWestLetterCount",
      name: "A West Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["275", "2b9"];

  // 🔑 Public Fields

  /** Names and explains `aWestLetterCount` for catalogs and inspectors. */
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
