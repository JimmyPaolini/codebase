import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ا (final Arabic alef)
 * glyph — a two-unit stem whose foot runs two units east to join — one per
 * corner and clockwise rotation, each counting the base template drawn that
 * way. Its Southwest orientation also reads as the final Arabic أ (alef with
 * hamza above), إ (alef with hamza below), and آ (alef with madda above),
 * which differ from it only by their hamza or madda. The base faces Southwest,
 * drawn:
 *
 * ```text
 * ╷
 * │
 * └─╴
 * ```
 */
@Injectable()
export class AlefFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest:
          "the final Arabic أ (alef with hamza above), إ (alef with hamza below), and آ (alef with madda above)",
      },
      glyph: "ا (final Arabic alef)",
      key: (name) => `alefFinal${name}ArabicCount`,
      script: "Arabic",
      shape: "a two-unit stem whose foot runs two units east to join",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4..", "c..", "a31"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `alefFinalSoutheastArabicCount` through `alefFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
