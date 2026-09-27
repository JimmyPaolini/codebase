import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ع (medial Arabic ain)
 * glyph — a unit loop on a three-unit baseline that joins east and west, its
 * top running a unit east as the head's ear — one per corner and clockwise
 * rotation, each counting the base template drawn that way. Its Southwest
 * orientation also reads as the medial Arabic غ (ghain), which differs from it
 * only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌┬╴
 * ╶┴┴╴
 * ```
 */
@Injectable()
export class AinMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the medial Arabic غ (ghain)",
      },
      glyph: "ع (medial Arabic ain)",
      key: (name) => `ainMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop on a three-unit baseline that joins east and west, its top running a unit east as the head's ear",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".671", "2bb1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `ainMedialSoutheastArabicCount` through `ainMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
