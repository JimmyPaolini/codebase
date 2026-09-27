import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ع (initial Arabic ain)
 * glyph — a unit head open to the east whose west corner joins west — one per
 * corner and clockwise rotation, each counting the base template drawn that
 * way. Its Southwest orientation also reads as the initial Arabic غ (ghain),
 * which differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌╴
 * ╶┴╴
 * ```
 */
@Injectable()
export class AinInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the initial Arabic غ (ghain)",
      },
      glyph: "ع (initial Arabic ain)",
      key: (name) => `ainInitial${name}ArabicCount`,
      script: "Arabic",
      shape: "a unit head open to the east whose west corner joins west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".61", "2b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `ainInitialSoutheastArabicCount` through `ainInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
