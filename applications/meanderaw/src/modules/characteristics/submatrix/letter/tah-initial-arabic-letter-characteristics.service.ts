import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ط (initial Arabic tah)
 * glyph — a unit stem rising from the west side of a unit loop whose west
 * corner joins west — one per corner and clockwise rotation, each counting the
 * base template drawn that way. Its Southwest orientation also reads as the
 * initial Arabic ظ (zah), which differs from it only by dots. The base faces
 * Southwest, drawn:
 *
 * ```text
 *  ╷
 *  ├┐
 * ╶┴┘
 * ```
 */
@Injectable()
export class TahInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the initial Arabic ظ (zah)",
      },
      glyph: "ط (initial Arabic tah)",
      key: (name) => `tahInitial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit stem rising from the west side of a unit loop whose west corner joins west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4.", ".e5", "2b9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `tahInitialSoutheastArabicCount` through `tahInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
