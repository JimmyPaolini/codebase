import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the د (final Arabic dal) glyph
 * — a unit head stroke above a three-unit baseline, joined to it by a unit
 * stroke one unit short of its east end, where it joins east — one per corner
 * and clockwise rotation, each counting the base template drawn that way. Its
 * Southwest orientation also reads as the final Arabic ذ (thal), which differs
 * from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ╶┐
 * ╶─┴╴
 * ```
 */
@Injectable()
export class DalFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ذ (thal)",
      },
      glyph: "د (final Arabic dal)",
      key: (name) => `dalFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit head stroke above a three-unit baseline, joined to it by a unit stroke one unit short of its east end, where it joins east",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".25.", "23b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `dalFinalSoutheastArabicCount` through `dalFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
