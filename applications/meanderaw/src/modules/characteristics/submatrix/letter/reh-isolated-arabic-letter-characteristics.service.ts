import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ر (isolated Arabic reh)
 * glyph — a unit stroke dropping into a one-step staircase that falls west to a
 * unit tail, its curve drawn as an orthogonal zig-zag — one per corner and
 * clockwise rotation, each counting the base template drawn that way. Its
 * Southwest orientation also reads as the isolated Arabic ز (zain), which
 * differs from it only by dots. The base faces Southwest, drawn:
 *
 * ```text
 *  ╷
 * ┌┘
 * ╵
 * ```
 */
@Injectable()
export class RehIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ز (zain)",
      },
      glyph: "ر (isolated Arabic reh)",
      key: (name) => `rehIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit stroke dropping into a one-step staircase that falls west to a unit tail, its curve drawn as an orthogonal zig-zag",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".4", "69", "8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `rehIsolatedSoutheastArabicCount` through `rehIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
