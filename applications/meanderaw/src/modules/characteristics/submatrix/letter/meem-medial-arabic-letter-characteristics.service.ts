import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the م (medial Arabic meem)
 * glyph — a unit loop hanging below a three-unit baseline that joins east and
 * west — one per corner and clockwise rotation, each counting the base template
 * drawn that way. The base faces Southwest, drawn:
 *
 * ```text
 * ╶┬┬╴
 *  └┘
 * ```
 */
@Injectable()
export class MeemMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "م (medial Arabic meem)",
      key: (name) => `meemMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop hanging below a three-unit baseline that joins east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["2771", ".a9."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `meemMedialSoutheastArabicCount` through `meemMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
