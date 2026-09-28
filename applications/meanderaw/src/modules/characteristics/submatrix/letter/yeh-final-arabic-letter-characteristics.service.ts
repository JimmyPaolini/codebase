import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ى (final Arabic alef
 * maksura, the dotless yeh) glyph — a two-unit joining stroke running east from
 * a reversed hook over a three-unit bowl with a unit tip rising at its west end
 * — one per corner and clockwise rotation, each counting the base template
 * drawn that way. Its Southwest orientation also reads as the final Arabic ي
 * (yeh), which differs from it only by dots, and ئ (yeh with hamza above),
 * which differs from it only by its hamza. The base faces Southwest, drawn:
 *
 * ```text
 *   ┌─╴
 * ╷ └┐
 * └──┘
 * ```
 */
@Injectable()
export class YehFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ي (yeh) and ئ (yeh with hamza above)",
      },
      glyph: "ى (final Arabic alef maksura, the dotless yeh)",
      key: (name) => `yehFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a two-unit joining stroke running east from a reversed hook over a three-unit bowl with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["..631", "4.a5.", "a339."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `yehFinalSoutheastArabicCount` through `yehFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
