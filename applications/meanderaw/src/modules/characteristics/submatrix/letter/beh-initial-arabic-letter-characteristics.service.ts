import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ٮ (initial Arabic dotless
 * beh) glyph — a unit tooth rising from the east end of a unit joining stroke
 * that runs west — one per corner and clockwise rotation, each counting the
 * base template drawn that way. Its Southwest orientation also reads as the
 * initial Arabic ب (beh), ت (teh), ث (theh), ن (noon), and ي (yeh), which
 * differ from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ╷
 * ╶┘
 * ```
 */
@Injectable()
export class BehInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest:
          "the initial Arabic ب (beh), ت (teh), ث (theh), ن (noon), and ي (yeh)",
      },
      glyph: "ٮ (initial Arabic dotless beh)",
      key: (name) => `behInitial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit tooth rising from the east end of a unit joining stroke that runs west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4", "29"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `behInitialSoutheastArabicCount` through `behInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
