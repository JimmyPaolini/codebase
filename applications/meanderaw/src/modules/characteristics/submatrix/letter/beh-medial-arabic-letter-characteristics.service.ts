import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ٮ (medial Arabic dotless
 * beh) glyph — a unit tooth rising from the middle of a two-unit baseline that
 * joins both east and west — one per corner and clockwise rotation, each
 * counting the base template drawn that way. Its Southwest orientation also
 * reads as the medial Arabic ب (beh), ت (teh), ث (theh), ن (noon), and ي (yeh),
 * which differ from it only by dots, and ئ (yeh with hamza above), which
 * differs from it only by its hamza. The base faces Southwest, drawn:
 *
 * ```text
 *  ╷
 * ╶┴╴
 * ```
 */
@Injectable()
export class BehMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest:
          "the medial Arabic ب (beh), ت (teh), ث (theh), ن (noon), ي (yeh), and ئ (yeh with hamza above)",
      },
      glyph: "ٮ (medial Arabic dotless beh)",
      key: (name) => `behMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit tooth rising from the middle of a two-unit baseline that joins both east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", "2b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `behMedialSoutheastArabicCount` through `behMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
