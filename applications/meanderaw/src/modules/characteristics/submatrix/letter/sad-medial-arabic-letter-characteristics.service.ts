import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ص (medial Arabic sad)
 * glyph — a unit loop east of a unit tooth on a four-unit baseline that joins
 * east and west — one per corner and clockwise rotation, each counting the base
 * template drawn that way. Its Southwest orientation also reads as the medial
 * Arabic ض (dad), which differs from it only by dots. The base faces Southwest,
 * drawn:
 *
 * ```text
 *  ╷┌┐
 * ╶┴┴┴╴
 * ```
 */
@Injectable()
export class SadMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the medial Arabic ض (dad)",
      },
      glyph: "ص (medial Arabic sad)",
      key: (name) => `sadMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop east of a unit tooth on a four-unit baseline that joins east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".465.", "2bbb1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `sadMedialSoutheastArabicCount` through `sadMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
