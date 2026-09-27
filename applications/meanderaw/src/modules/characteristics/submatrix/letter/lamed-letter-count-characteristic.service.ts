import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated ל (Hebrew lamed) glyphs of a Code — a unit step,
 * a unit stroke rising from the west end of a unit stroke and another dropping
 * from its east end — as a 3×2 submatrix scan against the glyph's template,
 * drawn:
 *
 * ```text
 * ╷
 * └┐
 *  ╵
 * ```
 */
@Injectable()
export class LamedLetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated ל (Hebrew lamed) glyphs — a unit step, a unit stroke rising from the west end of a unit stroke and another dropping from its east end.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "lamedLetterCount",
      letter: true,
      name: "Lamed Letter Count",
      submatrix: this.submatrixUtilitiesService.glyphWindow(this.template),
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "a5", ".8"];

  // 🔑 Public Fields

  /** Names and explains `lamedLetterCount` for catalogs and inspectors. */
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
