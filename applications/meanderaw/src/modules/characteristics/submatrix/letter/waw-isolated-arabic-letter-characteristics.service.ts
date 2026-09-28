import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the و (isolated Arabic waw)
 * glyph — a unit loop whose southeast corner drops into a one-step staircase
 * that falls west to a unit tail, its curve drawn as an orthogonal zig-zag —
 * one per corner and clockwise rotation, each counting the base template drawn
 * that way. Its Southwest orientation also reads as the isolated Arabic ؤ (waw
 * with hamza above), which differs from it only by its hamza. The base faces
 * Southwest, drawn:
 *
 * ```text
 * ┌┐
 * └┤
 * ┌┘
 * ╵
 * ```
 */
@Injectable()
export class WawIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ؤ (waw with hamza above)",
      },
      glyph: "و (isolated Arabic waw)",
      key: (name) => `wawIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit loop whose southeast corner drops into a one-step staircase that falls west to a unit tail, its curve drawn as an orthogonal zig-zag",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["65", "ad", "69", "8."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `wawIsolatedSoutheastArabicCount` through `wawIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
