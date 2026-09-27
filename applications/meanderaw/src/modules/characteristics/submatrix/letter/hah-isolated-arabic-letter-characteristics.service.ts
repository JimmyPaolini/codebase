import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ح (isolated Arabic hah)
 * glyph — a unit head stroke running east from a one-step staircase that drops
 * west into a two-unit base stroke running east, its curve drawn as an
 * orthogonal zig-zag — one per corner and clockwise rotation, each counting the
 * base template drawn that way. Its Southwest orientation also reads as the
 * isolated Arabic ج (jeem) and خ (khah), which differ from it only by dots. The
 * base faces Southwest, drawn:
 *
 * ```text
 *  ┌╴
 * ┌┘
 * └─╴
 * ```
 */
@Injectable()
export class HahIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic ج (jeem) and خ (khah)",
      },
      glyph: "ح (isolated Arabic hah)",
      key: (name) => `hahIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit head stroke running east from a one-step staircase that drops west into a two-unit base stroke running east, its curve drawn as an orthogonal zig-zag",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".61", "69.", "a31"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `hahIsolatedSoutheastArabicCount` through `hahIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
