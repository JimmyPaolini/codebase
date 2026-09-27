import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ك (medial Arabic kaf)
 * glyph — a three-unit top stroke running west from a unit stem standing on a
 * two-unit baseline that joins east and west — one per corner and clockwise
 * rotation, each counting the base template drawn that way. The base faces
 * Southwest, drawn:
 *
 * ```text
 * ╶──┐
 *   ╶┴╴
 * ```
 */
@Injectable()
export class KafMedialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ك (medial Arabic kaf)",
      key: (name) => `kafMedial${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a three-unit top stroke running west from a unit stem standing on a two-unit baseline that joins east and west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = ["2335.", "..2b1"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `kafMedialSoutheastArabicCount` through `kafMedialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
