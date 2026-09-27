import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated N glyphs of a Code — two posts joined by a
 * stepped diagonal, posts vertical — as a 3×3 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ┌┐╷
 * │││
 * ╵└┘
 * ```
 *
 * Also reads as the Greek Ν (nu).
 */
@Injectable()
export class NLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated N glyphs — two posts joined by a stepped diagonal, posts vertical. Also reads as the Greek Ν (nu).",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "nLetterCount",
      letter: true,
      name: "N Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["654", "ccc", "8a9"];

  // 🔑 Public Fields

  /** Names and explains `nLetterCount` for catalogs and inspectors. */
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
