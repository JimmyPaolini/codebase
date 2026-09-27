import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ك (initial Arabic kaf)
 * glyph — a three-unit top stroke running west from a unit stem whose foot
 * joins west — one per corner and clockwise rotation, each counting the base
 * template drawn that way. The base faces Southwest, drawn:
 *
 * ```text
 * ╶──┐
 *   ╶┘
 * ```
 */
@Injectable()
export class KafInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ك (initial Arabic kaf)",
      key: (name) => `kafInitial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a three-unit top stroke running west from a unit stem whose foot joins west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["2335", "..29"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `kafInitialSoutheastArabicCount` through `kafInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
