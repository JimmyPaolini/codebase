import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the س (isolated Arabic seen)
 * glyph — three unit teeth on a three-unit baseline whose west end drops into a
 * two-unit bowl with a unit tip rising at its west end — one per corner and
 * clockwise rotation, each counting the base template drawn that way. Its
 * Southwest orientation also reads as the isolated Arabic ش (sheen), which
 * differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *    ╷╷╷
 * ╷ ┌┴┴┘
 * └─┘
 * ```
 */
@Injectable()
export class SeenIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ش (sheen)",
      },
      glyph: "س (isolated Arabic seen)",
      key: (name) => `seenIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "three unit teeth on a three-unit baseline whose west end drops into a two-unit bowl with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["...444", "4.6bb9", "a39..."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `seenIsolatedSoutheastArabicCount` through `seenIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
