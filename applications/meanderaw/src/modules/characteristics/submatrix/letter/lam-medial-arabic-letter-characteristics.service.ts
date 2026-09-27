import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ل (medial Arabic lam)
 * glyph — a three-unit stem standing on a two-unit baseline that joins east and
 * west — one per corner and clockwise rotation, each counting the base template
 * drawn that way. The base faces Southwest, drawn:
 *
 * ```text
 *  ╷
 *  │
 *  │
 * ╶┴╴
 * ```
 */
@Injectable()
export class LamMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ل (medial Arabic lam)",
      key: (name) => `lamMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a three-unit stem standing on a two-unit baseline that joins east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", ".c.", ".c.", "2b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `lamMedialSoutheastArabicCount` through `lamMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
