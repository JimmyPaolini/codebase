import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ع (final Arabic ain) glyph
 * — a unit loop whose east corner joins east, dropping west into a unit stroke
 * and a two-unit base stroke running east — one per corner and clockwise
 * rotation, each counting the base template drawn that way. Its Southwest
 * orientation also reads as the final Arabic غ (ghain), which differs from it
 * only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌┐
 * ┌┴┴╴
 * └─╴
 * ```
 */
@Injectable()
export class AinFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic غ (ghain)",
      },
      glyph: "ع (final Arabic ain)",
      key: (name) => `ainFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop whose east corner joins east, dropping west into a unit stroke and a two-unit base stroke running east",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65.", "6bb1", "a31."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `ainFinalSoutheastArabicCount` through `ainFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
