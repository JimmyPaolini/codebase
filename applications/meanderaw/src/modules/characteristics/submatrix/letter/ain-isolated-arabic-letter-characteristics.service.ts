import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ع (isolated Arabic ain)
 * glyph — a unit hook open to the east sitting on the middle of a two-unit bar,
 * whose west end drops a unit stroke into a two-unit base stroke, two bowls
 * open to the east stacked — one per corner and clockwise rotation, each
 * counting the base template drawn that way. Its Southwest orientation also
 * reads as the isolated Arabic غ (ghain), which differs from it only by dots.
 * The base faces Southwest, drawn:
 *
 * ```text
 *  ┌╴
 * ┌┴╴
 * └─╴
 * ```
 */
@Injectable()
export class AinIsolatedArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      aliases: {
        Southwest: "the isolated Arabic غ (ghain)",
      },
      glyph: "ع (isolated Arabic ain)",
      key: (name) => `ainIsolated${name}ArabicCount`,
      script: "Arabic",
      shape:
        "a unit hook open to the east sitting on the middle of a two-unit bar, whose west end drops a unit stroke into a two-unit base stroke, two bowls open to the east stacked",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".61", "6b1", "a31"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `ainIsolatedSoutheastArabicCount` through `ainIsolatedNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
