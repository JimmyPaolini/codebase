import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ٯ (isolated Arabic dotless
 * qaf) glyph — a unit loop whose southwest corner drops into a two-unit bowl
 * with a unit tip rising at its west end — one per corner and clockwise
 * rotation, each counting the base template drawn that way. Its Southwest
 * orientation also reads as the isolated Arabic ق (qaf), which differs from it
 * only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *   ┌┐
 * ╷ ├┘
 * └─┘
 * ```
 */
@Injectable()
export class QafIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ق (qaf)",
      },
      glyph: "ٯ (isolated Arabic dotless qaf)",
      key: (name) => `qafIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop whose southwest corner drops into a two-unit bowl with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["..65", "4.e9", "a39."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `qafIsolatedSoutheastArabicCount` through `qafIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
