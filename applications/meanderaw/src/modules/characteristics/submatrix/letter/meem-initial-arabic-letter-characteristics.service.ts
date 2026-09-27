import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the م (initial Arabic meem)
 * glyph — a unit loop hanging below a joining stroke that runs west from its
 * northwest corner — one per corner and clockwise rotation, each counting the
 * base template drawn that way. The base faces Southwest, drawn:
 *
 * ```text
 * ╶┬┐
 *  └┘
 * ```
 */
@Injectable()
export class MeemInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "م (initial Arabic meem)",
      key: (name) => `meemInitial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop hanging below a joining stroke that runs west from its northwest corner",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["275", ".a9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `meemInitialSoutheastArabicCount` through `meemInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
