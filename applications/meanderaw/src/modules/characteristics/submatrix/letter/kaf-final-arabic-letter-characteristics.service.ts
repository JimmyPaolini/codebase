import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ك (final Arabic kaf) glyph
 * — a two-unit stem at the west end of a three-unit baseline that joins east,
 * with a unit tip rising one unit short of its east end — one per corner and
 * clockwise rotation, each counting the base template drawn that way. The base
 * faces Southwest, drawn:
 *
 * ```text
 * ╷
 * │ ╷
 * └─┴╴
 * ```
 */
@Injectable()
export class KafFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ك (final Arabic kaf)",
      key: (name) => `kafFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a two-unit stem at the west end of a three-unit baseline that joins east, with a unit tip rising one unit short of its east end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4...", "c.4.", "a3b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `kafFinalSoutheastArabicCount` through `kafFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
