import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ه (final Arabic heh) glyph
 * — a two-unit-tall loop joined east from the middle of its east side — one per
 * corner and clockwise rotation, each counting the base template drawn that
 * way. Its Southwest orientation also reads as the final Arabic ة (teh
 * marbuta), which differs from it only by dots. The base faces Southwest,
 * drawn:
 *
 * ```text
 * ┌┐
 * │├╴
 * └┘
 * ```
 */
@Injectable()
export class HehFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ة (teh marbuta)",
      },
      glyph: "ه (final Arabic heh)",
      key: (name) => `hehFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a two-unit-tall loop joined east from the middle of its east side",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65.", "ce1", "a9."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `hehFinalSoutheastArabicCount` through `hehFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
