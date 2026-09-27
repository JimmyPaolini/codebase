import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ص (initial Arabic sad)
 * glyph — a unit loop east of a unit tooth on a three-unit baseline whose west
 * end joins west — one per corner and clockwise rotation, each counting the
 * base template drawn that way. Its Southwest orientation also reads as the
 * initial Arabic ض (dad), which differs from it only by dots. The base faces
 * Southwest, drawn:
 *
 * ```text
 *  ╷┌┐
 * ╶┴┴┘
 * ```
 */
@Injectable()
export class SadInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the initial Arabic ض (dad)",
      },
      glyph: "ص (initial Arabic sad)",
      key: (name) => `sadInitial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop east of a unit tooth on a three-unit baseline whose west end joins west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".465", "2bb9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `sadInitialSoutheastArabicCount` through `sadInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
