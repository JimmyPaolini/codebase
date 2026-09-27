import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ں (isolated Arabic dotless
 * noon) glyph — a bowl two units wide and two units deep, open to the north —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. Its Southwest orientation also reads as the isolated Arabic ن
 * (noon), which differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 * ╷ ╷
 * │ │
 * └─┘
 * ```
 */
@Injectable()
export class NoonIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ن (noon)",
      },
      glyph: "ں (isolated Arabic dotless noon)",
      key: (name) => `noonIsolated${name}ArabicCount`,
      script: "Arabic",
      shape: "a bowl two units wide and two units deep, open to the north",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.4", "c.c", "a39"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `noonIsolatedSoutheastArabicCount` through `noonIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
