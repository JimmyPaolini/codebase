import { Injectable } from "@nestjs/common";

import { countPointsWithExactArms } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the crosses of a Code — points whose ink leaves by all four arms,
 * drawn ┼ — as a 1×1 submatrix scan.
 */
@Injectable()
export class CrossCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `crossCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of cross points whose ink leaves by all four arms (┼).",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{N, S, E, W\} \,\}\right|`,
    key: "crossCount",
    name: "Cross Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points that carry all four arms. */
  public compute(context: CharacteristicContext): number {
    return countPointsWithExactArms(context.matrix, [
      "east",
      "north",
      "south",
      "west",
    ]);
  }
}
