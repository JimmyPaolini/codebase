import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ه (medial Arabic heh)
 * glyph — a unit loop above and a unit loop below a three-unit baseline that
 * joins east and west — one per corner and clockwise rotation, each counting
 * the base template drawn that way. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌┐
 * ╶┼┼╴
 *  └┘
 * ```
 */
@Injectable()
export class HehMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ه (medial Arabic heh)",
      key: (name) => `hehMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop above and a unit loop below a three-unit baseline that joins east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65.", "2ff1", ".a9."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `hehMedialSoutheastArabicCount` through `hehMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
