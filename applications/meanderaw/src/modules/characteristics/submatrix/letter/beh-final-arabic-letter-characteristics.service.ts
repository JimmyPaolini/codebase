import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ٮ (final Arabic dotless
 * beh) glyph — a unit tip rising from the west end of a two-unit baseline that
 * joins east, a shallow bowl open to the north — one per corner and clockwise
 * rotation, each counting the base template drawn that way. Its Southwest
 * orientation also reads as the final Arabic ب (beh), ت (teh), and ث (theh),
 * which differ from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 * ╷
 * └─╴
 * ```
 */
@Injectable()
export class BehFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ب (beh), ت (teh), and ث (theh)",
      },
      glyph: "ٮ (final Arabic dotless beh)",
      key: (name) => `behFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit tip rising from the west end of a two-unit baseline that joins east, a shallow bowl open to the north",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4..", "a31"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `behFinalSoutheastArabicCount` through `behFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
