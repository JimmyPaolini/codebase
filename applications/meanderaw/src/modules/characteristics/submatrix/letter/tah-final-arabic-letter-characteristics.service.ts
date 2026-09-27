import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ط (final Arabic tah) glyph
 * — a unit stem rising from the west side of a unit loop whose east corner
 * joins east — one per corner and clockwise rotation, each counting the base
 * template drawn that way. Its Southwest orientation also reads as the final
 * Arabic ظ (zah), which differs from it only by dots. The base faces Southwest,
 * drawn:
 *
 * ```text
 * ╷
 * ├┐
 * └┴╴
 * ```
 */
@Injectable()
export class TahFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ظ (zah)",
      },
      glyph: "ط (final Arabic tah)",
      key: (name) => `tahFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit stem rising from the west side of a unit loop whose east corner joins east",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4..", "e5.", "ab1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `tahFinalSoutheastArabicCount` through `tahFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
