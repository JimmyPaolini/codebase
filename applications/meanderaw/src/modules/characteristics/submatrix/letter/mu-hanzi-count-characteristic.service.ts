import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated 目 (hanzi mu) glyphs of a Code — three unit
 * squares stacked north to south, each sharing an edge with the next — as a 4×2
 * submatrix scan against the glyph's template, drawn:
 *
 * ```text
 * ┌┐
 * ├┤
 * ├┤
 * └┘
 * ```
 */
@Injectable()
export class MuHanziCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated 目 (hanzi mu) glyphs — three unit squares stacked north to south, each sharing an edge with the next.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "muHanziCount",
      letter: true,
      name: "Mu Hanzi Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "ed", "ed", "a9"];

  // 🔑 Public Fields

  /** Names and explains `muHanziCount` for catalogs and inspectors. */
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
