import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated Ρ (Greek rho) glyphs of a Code — a closed unit
 * square whose west side runs on a unit below it as a stem — as a 3×2 submatrix
 * scan against the glyph's template, drawn:
 *
 * ```text
 * ┌┐
 * ├┘
 * ╵
 * ```
 */
@Injectable()
export class RhoLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated Ρ (Greek rho) glyphs — a closed unit square whose west side runs on a unit below it as a stem. Also reads as the Latin P.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "rhoLetterCount",
      name: "Rho Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "e9", "8."];

  // 🔑 Public Fields

  /** Names and explains `rhoLetterCount` for catalogs and inspectors. */
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
