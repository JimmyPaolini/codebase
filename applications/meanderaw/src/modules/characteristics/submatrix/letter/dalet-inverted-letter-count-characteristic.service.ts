import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ד (Hebrew dalet) glyphs of a Code — a three-unit
 * roof with a unit leg dropping a unit short of its east end, turned upside
 * down — as a 2×4 submatrix scan against the glyph's template, drawn:
 *
 * ```text
 *  ╷
 * ╶┴─╴
 * ```
 */
@Injectable()
export class DaletInvertedLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ד (Hebrew dalet) glyphs — a three-unit roof with a unit leg dropping a unit short of its east end, turned upside down.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "daletInvertedLetterCount",
      name: "Dalet Inverted Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4..", "2b31"];

  // 🔑 Public Fields

  /** Names and explains `daletInvertedLetterCount` for catalogs and inspectors. */
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
