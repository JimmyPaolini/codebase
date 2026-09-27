import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ى (isolated Arabic alef
 * maksura, the dotless yeh) glyph — a unit head stroke running east from a
 * stroke that doubles back from the east, dropping into a three-unit bowl with
 * a unit tip rising at its west end — one per corner and clockwise rotation,
 * each counting the base template drawn that way. Its Southwest orientation
 * also reads as the isolated Arabic ي (yeh), which differs from it only by
 * dots. The base faces Southwest, drawn:
 *
 * ```text
 *   ┌╴
 * ╷ └┐
 * └──┘
 * ```
 */
@Injectable()
export class YehIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ي (yeh)",
      },
      glyph: "ى (isolated Arabic alef maksura, the dotless yeh)",
      key: (name) => `yehIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit head stroke running east from a stroke that doubles back from the east, dropping into a three-unit bowl with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["..61", "4.a5", "a339"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `yehIsolatedSoutheastArabicCount` through `yehIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
