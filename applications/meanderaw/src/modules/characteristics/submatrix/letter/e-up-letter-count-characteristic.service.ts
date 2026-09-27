import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated E glyphs of a Code — a spine with three equal
 * prongs, prongs pointing north — as a 2×3 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ╷╷╷
 * └┴┘
 * ```
 *
 * Also reads as the hanzi 山 (shan).
 */
@Injectable()
export class EUpLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated E glyphs — a spine with three equal prongs, prongs pointing north. Also reads as the hanzi 山 (shan).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "eUpLetterCount",
      letter: true,
      name: "E Up Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["444", "ab9"];

  // 🔑 Public Fields

  /** Names and explains `eUpLetterCount` for catalogs and inspectors. */
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
