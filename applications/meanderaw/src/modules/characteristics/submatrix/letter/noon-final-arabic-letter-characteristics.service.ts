import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ں (final Arabic dotless
 * noon) glyph — a two-unit deep bowl with a two-unit tip rising at its west
 * end, whose east side rises to a unit joining stroke — one per corner and
 * clockwise rotation, each counting the base template drawn that way. Its
 * Southwest orientation also reads as the final Arabic ن (noon), which differs
 * from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 * ╷ ┌╴
 * │ │
 * └─┘
 * ```
 */
@Injectable()
export class NoonFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ن (noon)",
      },
      glyph: "ں (final Arabic dotless noon)",
      key: (name) => `noonFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a two-unit deep bowl with a two-unit tip rising at its west end, whose east side rises to a unit joining stroke",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.61", "c.c.", "a39."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `noonFinalSoutheastArabicCount` through `noonFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
