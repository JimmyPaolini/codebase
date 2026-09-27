import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ٮ (isolated Arabic dotless
 * beh) glyph — a two-unit baseline with a unit tip rising from each end, a
 * shallow bowl open to the north — one per corner and clockwise rotation, each
 * counting the base template drawn that way. Its Southwest orientation also
 * reads as the isolated Arabic ب (beh), ت (teh), and ث (theh), which differ
 * from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 * ╷ ╷
 * └─┘
 * ```
 */
@Injectable()
export class BehIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ب (beh), ت (teh), and ث (theh)",
      },
      glyph: "ٮ (isolated Arabic dotless beh)",
      key: (name) => `behIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a two-unit baseline with a unit tip rising from each end, a shallow bowl open to the north",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.4", "a39"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `behIsolatedSoutheastArabicCount` through `behIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
