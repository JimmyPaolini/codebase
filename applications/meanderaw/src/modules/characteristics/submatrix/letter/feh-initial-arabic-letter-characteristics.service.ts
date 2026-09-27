import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ڡ (initial Arabic dotless
 * feh) glyph — a unit loop raised on a unit neck at its east side, whose foot
 * runs two units west to join — one per corner and clockwise rotation, each
 * counting the base template drawn that way. Its Southwest orientation also
 * reads as the initial Arabic ف (feh), ٯ (dotless qaf), and ق (qaf), which
 * differ from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌┐
 *  └┤
 * ╶─┘
 * ```
 */
@Injectable()
export class FehInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the initial Arabic ف (feh), ٯ (dotless qaf), and ق (qaf)",
      },
      glyph: "ڡ (initial Arabic dotless feh)",
      key: (name) => `fehInitial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop raised on a unit neck at its east side, whose foot runs two units west to join",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65", ".ad", "239"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `fehInitialSoutheastArabicCount` through `fehInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
