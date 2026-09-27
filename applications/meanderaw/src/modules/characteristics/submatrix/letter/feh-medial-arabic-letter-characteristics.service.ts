import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ڡ (medial Arabic dotless
 * feh) glyph — a unit loop raised on a unit neck at its east side, standing on
 * a three-unit baseline that joins east and west — one per corner and clockwise
 * rotation, each counting the base template drawn that way. Its Southwest
 * orientation also reads as the medial Arabic ف (feh), ٯ (dotless qaf), and ق
 * (qaf), which differ from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌┐
 *  └┤
 * ╶─┴╴
 * ```
 */
@Injectable()
export class FehMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the medial Arabic ف (feh), ٯ (dotless qaf), and ق (qaf)",
      },
      glyph: "ڡ (medial Arabic dotless feh)",
      key: (name) => `fehMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop raised on a unit neck at its east side, standing on a three-unit baseline that joins east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65.", ".ad.", "23b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `fehMedialSoutheastArabicCount` through `fehMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
