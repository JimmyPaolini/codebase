import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated F glyphs of a Code — a spine with prongs at one
 * end and the middle, prongs pointing east — as a 3×2 submatrix scan against
 * the glyph's template, drawn:
 *
 * ```text
 * ┌╴
 * ├╴
 * ╵
 * ```
 */
@Injectable()
export class FLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated F glyphs — a spine with prongs at one end and the middle, prongs pointing east.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "fLetterCount",
      name: "F Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "e1", "8."];

  // 🔑 Public Fields

  /** Names and explains `fLetterCount` for catalogs and inspectors. */
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
