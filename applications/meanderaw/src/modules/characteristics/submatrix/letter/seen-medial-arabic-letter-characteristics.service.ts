import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the س (medial Arabic seen)
 * glyph — three unit teeth on a four-unit baseline that joins east and west —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. Its Southwest orientation also reads as the medial Arabic ش
 * (sheen), which differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ╷╷╷
 * ╶┴┴┴╴
 * ```
 */
@Injectable()
export class SeenMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the medial Arabic ش (sheen)",
      },
      glyph: "س (medial Arabic seen)",
      key: (name) => `seenMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "three unit teeth on a four-unit baseline that joins east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".444.", "2bbb1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `seenMedialSoutheastArabicCount` through `seenMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
