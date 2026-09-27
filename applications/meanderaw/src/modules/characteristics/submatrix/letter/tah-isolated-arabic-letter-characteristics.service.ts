import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ط (isolated Arabic tah)
 * glyph — a unit loop with a unit stem rising from its northwest corner — one
 * per corner and clockwise rotation, each counting the base template drawn that
 * way. Its Southwest orientation also reads as the isolated Arabic ظ (zah),
 * which differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 * ╷
 * ├┐
 * └┘
 * ```
 */
@Injectable()
export class TahIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ظ (zah)",
      },
      glyph: "ط (isolated Arabic tah)",
      key: (name) => `tahIsolated${name}ArabicCount`,
      script: "Arabic",
      shape: "a unit loop with a unit stem rising from its northwest corner",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4.", "e5", "a9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `tahIsolatedSoutheastArabicCount` through `tahIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
