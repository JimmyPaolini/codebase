import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the س (initial Arabic seen)
 * glyph — three unit teeth on a three-unit baseline whose west end joins west —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. Its Southwest orientation also reads as the initial Arabic ش
 * (sheen), which differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ╷╷╷
 * ╶┴┴┘
 * ```
 */
@Injectable()
export class SeenInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the initial Arabic ش (sheen)",
      },
      glyph: "س (initial Arabic seen)",
      key: (name) => `seenInitial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "three unit teeth on a three-unit baseline whose west end joins west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".444", "2bb9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `seenInitialSoutheastArabicCount` through `seenInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
