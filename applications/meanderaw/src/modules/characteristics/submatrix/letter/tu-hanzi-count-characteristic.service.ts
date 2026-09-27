import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated 凸 (hanzi tu) glyphs of a Code — the outline of a
 * unit square standing on the middle of a three-unit bar — as a 3×4 submatrix
 * scan against the glyph's template, drawn:
 *
 * ```text
 *  ┌┐
 * ┌┘└┐
 * └──┘
 * ```
 */
@Injectable()
export class TuHanziCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated 凸 (hanzi tu) glyphs — the outline of a unit square standing on the middle of a three-unit bar.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "tuHanziCount",
      name: "Tu Hanzi Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65.", "69a5", "a339"];

  // 🔑 Public Fields

  /** Names and explains `tuHanziCount` for catalogs and inspectors. */
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
