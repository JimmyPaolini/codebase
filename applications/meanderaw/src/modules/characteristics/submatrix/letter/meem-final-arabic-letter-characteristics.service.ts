import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the م (final Arabic meem)
 * glyph — a unit loop whose northeast corner joins east, with a two-unit tail
 * hanging from its southwest corner — one per corner and clockwise rotation,
 * each counting the base template drawn that way. The base faces Southwest,
 * drawn:
 *
 * ```text
 * ┌┬╴
 * ├┘
 * │
 * ╵
 * ```
 */
@Injectable()
export class MeemFinalArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "م (final Arabic meem)",
      key: (name) => `meemFinal${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop whose northeast corner joins east, with a two-unit tail hanging from its southwest corner",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["671", "e9.", "c..", "8.."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `meemFinalSoutheastArabicCount` through `meemFinalNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
