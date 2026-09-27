import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ٯ (final Arabic dotless
 * qaf) glyph — a unit loop whose east corner joins east, set on a two-unit bowl
 * below it with a unit tip rising at its west end — one per corner and
 * clockwise rotation, each counting the base template drawn that way. Its
 * Southwest orientation also reads as the final Arabic ق (qaf), which differs
 * from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *   ┌┐
 * ╷ ├┴╴
 * └─┘
 * ```
 */
@Injectable()
export class QafFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ق (qaf)",
      },
      glyph: "ٯ (final Arabic dotless qaf)",
      key: (name) => `qafFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop whose east corner joins east, set on a two-unit bowl below it with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["..65.", "4.eb1", "a39.."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `qafFinalSoutheastArabicCount` through `qafFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
