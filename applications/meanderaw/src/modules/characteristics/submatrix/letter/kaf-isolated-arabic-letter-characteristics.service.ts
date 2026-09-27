import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ك (isolated Arabic kaf)
 * glyph — a two-unit baseline with a two-unit stem rising from its west end and
 * a unit tip rising from its east end — one per corner and clockwise rotation,
 * each counting the base template drawn that way. The base faces Southwest,
 * drawn:
 *
 * ```text
 * ╷
 * │ ╷
 * └─┘
 * ```
 */
@Injectable()
export class KafIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ك (isolated Arabic kaf)",
      key: (name) => `kafIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a two-unit baseline with a two-unit stem rising from its west end and a unit tip rising from its east end",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["4..", "c.4", "a39"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `kafIsolatedSoutheastArabicCount` through `kafIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
