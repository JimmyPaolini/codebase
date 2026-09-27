import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ڡ (final Arabic dotless
 * feh) glyph — a unit loop on a four-unit baseline that joins east, with a unit
 * tip rising at its west end — one per corner and clockwise rotation, each
 * counting the base template drawn that way. Its Southwest orientation also
 * reads as the final Arabic ف (feh), which differs from it only by dots. The
 * base faces Southwest, drawn:
 *
 * ```text
 * ╷ ┌┐
 * └─┴┴╴
 * ```
 */
@Injectable()
export class FehFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ف (feh)",
      },
      glyph: "ڡ (final Arabic dotless feh)",
      key: (name) => `fehFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop on a four-unit baseline that joins east, with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.65.", "a3bb1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `fehFinalSoutheastArabicCount` through `fehFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
