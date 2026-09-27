import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ת (Hebrew tav) glyphs of a Code — a unit roof on
 * two unit legs, the west leg kicking a unit foot out to the west, turned a
 * quarter clockwise so its base faces west — as a 3×2 submatrix scan against the
 * glyph's template, drawn:
 *
 * ```text
 * ╷
 * └┐
 * ╶┘
 * ```
 */
@Injectable()
export class TavWestLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ת (Hebrew tav) glyphs — a unit roof on two unit legs, the west leg kicking a unit foot out to the west, turned a quarter clockwise so its base faces west.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "tavWestLetterCount",
      name: "Tav West Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "a5", "29"];

  // 🔑 Public Fields

  /** Names and explains `tavWestLetterCount` for catalogs and inspectors. */
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
