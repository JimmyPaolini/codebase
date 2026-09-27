import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ح (medial Arabic hah)
 * glyph — a unit head stroke running east from a one-step staircase that drops
 * west onto a two-unit baseline joining east and west, its curve drawn as an
 * orthogonal zig-zag — one per corner and clockwise rotation, each counting the
 * base template drawn that way. Its Southwest orientation also reads as the
 * medial Arabic ج (jeem) and خ (khah), which differ from it only by dots. The
 * base faces Southwest, drawn:
 *
 * ```text
 *   ┌╴
 *  ┌┘
 * ╶┴╴
 * ```
 */
@Injectable()
export class HahMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the medial Arabic ج (jeem) and خ (khah)",
      },
      glyph: "ح (medial Arabic hah)",
      key: (name) => `hahMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit head stroke running east from a one-step staircase that drops west onto a two-unit baseline joining east and west, its curve drawn as an orthogonal zig-zag",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["..61", ".69.", "2b1."];

  // 🔑 Public Fields

  /** One evaluator per orientation, `hahMedialSoutheastArabicCount` through `hahMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
