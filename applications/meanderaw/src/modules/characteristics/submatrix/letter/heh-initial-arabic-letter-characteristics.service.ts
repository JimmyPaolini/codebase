import { Inject, Injectable } from "@nestjs/common";

import { LetterUtilitiesService } from "./letter-utilities.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";

/**
 * Provides the sixteen orientation evaluators of the ه (initial Arabic heh)
 * glyph — two stacked unit loops whose southwest corner joins west — one per
 * corner and clockwise rotation, each counting the base template drawn that
 * way. The base faces Southwest, drawn:
 *
 * ```text
 *  ┌┐
 *  ├┤
 * ╶┴┘
 * ```
 */
@Injectable()
export class HehInitialArabicLetterCharacteristicsService implements CharacteristicEvaluatorGroup<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LetterUtilitiesService)
    private readonly letterUtilitiesService: LetterUtilitiesService,
  ) {
    this.evaluators = this.letterUtilitiesService.evaluators({
      glyph: "ه (initial Arabic heh)",
      key: (name) => `hehInitial${name}ArabicCount`,
      script: "Arabic",
      shape: "two stacked unit loops whose southwest corner joins west",
      template: this.template,
    });
  }

  // 🔐 Private Fields

  /** The upright glyph's points as hexadecimal Code digits, one string per row, `.` outside the glyph. */
  private readonly template: readonly string[] = [".65", ".ed", "2b9"];

  // 🔑 Public Fields

  /** One evaluator per orientation, `hehInitialSoutheastArabicCount` through `hehInitialNorthwestThreeQuarterArabicCount`. */
  public readonly evaluators: readonly CharacteristicEvaluator<number>[];

  // 🔏 Private Methods

  // 🌎 Public Methods
}
