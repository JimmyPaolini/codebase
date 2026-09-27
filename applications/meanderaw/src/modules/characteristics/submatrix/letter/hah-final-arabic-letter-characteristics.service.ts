import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ح (final Arabic hah) glyph
 * — a two-unit joining stroke running east from a one-step staircase that drops
 * west into a two-unit base stroke running east, its curve drawn as an
 * orthogonal zig-zag — one per corner and clockwise rotation, each counting the
 * base template drawn that way. Its Southwest orientation also reads as the
 * final Arabic ج (jeem) and خ (khah), which differ from it only by dots. The
 * base faces Southwest, drawn:
 *
 * ```text
 *  ┌─╴
 * ┌┘
 * └─╴
 * ```
 */
@Injectable()
export class HahFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ج (jeem) and خ (khah)",
      },
      glyph: "ح (final Arabic hah)",
      key: (name) => `hahFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a two-unit joining stroke running east from a one-step staircase that drops west into a two-unit base stroke running east, its curve drawn as an orthogonal zig-zag",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".631", "69..", "a31."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `hahFinalSoutheastArabicCount` through `hahFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
