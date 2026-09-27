import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ل (final Arabic lam) glyph
 * — a three-unit stem standing one unit short of the east end of a three-unit
 * baseline that joins east, with a unit tip rising at its west end — one per
 * corner and clockwise rotation, each counting the base template drawn that
 * way. The base faces Southwest, drawn:
 *
 * ```text
 *   ╷
 *   │
 * ╷ │
 * └─┴╴
 * ```
 */
@Injectable()
export class LamFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ل (final Arabic lam)",
      key: (name) => `lamFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a three-unit stem standing one unit short of the east end of a three-unit baseline that joins east, with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [
    "..4.",
    "..c.",
    "4.c.",
    "a3b1",
  ];

  // 🔑 Public Fields

  /** One evaluator per orientation, `lamFinalSoutheastArabicCount` through `lamFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
