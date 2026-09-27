import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ل (isolated Arabic lam)
 * glyph — a three-unit stem dropping into a two-unit bowl with a unit tip
 * rising at its west end — one per corner and clockwise rotation, each counting
 * the base template drawn that way. The base faces Southwest, drawn:
 *
 * ```text
 *   ╷
 *   │
 * ╷ │
 * └─┘
 * ```
 */
@Injectable()
export class LamIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ل (isolated Arabic lam)",
      key: (name) => `lamIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a three-unit stem dropping into a two-unit bowl with a unit tip rising at its west end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["..4", "..c", "4.c", "a39"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `lamIsolatedSoutheastArabicCount` through `lamIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
