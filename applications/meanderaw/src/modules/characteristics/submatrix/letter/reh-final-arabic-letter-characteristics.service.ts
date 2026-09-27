import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ر (final Arabic reh) glyph
 * — a unit joining stroke running east from a one-step staircase that falls
 * west to a unit tail, its curve drawn as an orthogonal zig-zag — one per
 * corner and clockwise rotation, each counting the base template drawn that
 * way. Its Southwest orientation also reads as the final Arabic ز (zain), which
 * differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌╴
 * ┌┘
 * ╵
 * ```
 */
@Injectable()
export class RehFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the final Arabic ز (zain)",
      },
      glyph: "ر (final Arabic reh)",
      key: (name) => `rehFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit joining stroke running east from a one-step staircase that falls west to a unit tail, its curve drawn as an orthogonal zig-zag",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".61", "69.", "8.."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `rehFinalSoutheastArabicCount` through `rehFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
