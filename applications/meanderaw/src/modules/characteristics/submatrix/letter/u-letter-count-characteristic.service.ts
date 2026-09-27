import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the minimal isolated U glyphs of a Code — a unit square missing one
 * side, open to the north — as a 2×2 submatrix scan against the glyph's
 * template, drawn:
 *
 * ```text
 * ╷╷
 * └┘
 * ```
 */
@Injectable()
export class ULetterCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {
    this.metadata = {
      category: "submatrix",
      description:
        "The number of minimal isolated U glyphs — a unit square missing one side, open to the north.",
      formula: this.submatrixUtilitiesService.glyphFormula(this.template),
      key: "uLetterCount",
      name: "U Letter Count",
      valueType: "number",
    };
  }

  // 🔐 Private Fields

  /** The glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["44", "a9"];

  // 🔑 Public Fields

  /** Names and explains `uLetterCount` for catalogs and inspectors. */
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
