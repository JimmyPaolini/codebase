import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated S glyphs of a Code — three bars joined into a
 * serpentine, bars horizontal — as a 3×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ┌╴
 * └┐
 * ╶┘
 * ```
 */
@Injectable()
export class SLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated S glyphs — three bars joined into a serpentine, bars horizontal.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "sLetterCount",
      name: "S Letter Count",
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["61", "a5", "29"];

  // 🔑 Public Fields

  /** Names and explains `sLetterCount` for catalogs and inspectors. */
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
