import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated Ψ (Greek psi) glyphs of a Code — a two-unit bar
 * with a unit prong rising from each end and from its middle, the middle prong
 * running on a unit below the bar as a stem, turned a quarter clockwise so its
 * stem faces west — as a 3×3 submatrix scan against the glyph's template,
 * drawn:
 *
 * ```text
 *  ┌╴
 * ╶┼╴
 *  └╴
 * ```
 */
@Injectable()
export class PsiWestLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated Ψ (Greek psi) glyphs — a two-unit bar with a unit prong rising from each end and from its middle, the middle prong running on a unit below the bar as a stem, turned a quarter clockwise so its stem faces west.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "psiWestLetterCount",
      letter: true,
      name: "Psi West Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".61", "2f1", ".a1"];

  // 🔑 Public Fields

  /** Names and explains `psiWestLetterCount` for catalogs and inspectors. */
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
