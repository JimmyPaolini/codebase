import { Injectable } from "@nestjs/common";

import { countPointsWithExactArms } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the straight horizontal points of a Code — ink passing through east to west and nowhere else — as a 1×1 submatrix scan.
 */
@Injectable()
export class HorizontalEdgeCountCharacteristicService implements CharacteristicEvaluator {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `horizontalEdgeCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of points whose ink runs straight through east and west, with no north or south arm.",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{E, W\} \,\}\right|`,
    key: "horizontalEdgeCount",
    name: "Horizontal Edge Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are east and west. */
  public compute(context: CharacteristicContext): number {
    return countPointsWithExactArms(context.matrix, ["east", "west"]);
  }
}
