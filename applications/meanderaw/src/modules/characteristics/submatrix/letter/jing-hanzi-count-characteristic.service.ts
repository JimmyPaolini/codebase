import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated 井 (hanzi jing) glyphs of a Code — a unit square
 * whose four sides each run a unit past both ends — as a 4×4 submatrix scan
 * against the glyph's template, drawn:
 *
 * ```text
 *  ╷╷
 * ╶┼┼╴
 * ╶┼┼╴
 *  ╵╵
 * ```
 */
@Injectable()
export class JingHanziCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated 井 (hanzi jing) glyphs — a unit square whose four sides each run a unit past both ends.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "jingHanziCount",
      letter: true,
      name: "Jing Hanzi Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [
    ".44.",
    "2ff1",
    "2ff1",
    ".88.",
  ];

  // 🔑 Public Fields

  /** Names and explains `jingHanziCount` for catalogs and inspectors. */
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
