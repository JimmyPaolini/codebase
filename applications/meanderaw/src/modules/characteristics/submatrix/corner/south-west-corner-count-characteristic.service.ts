import { Injectable } from "@nestjs/common";

import { countPointsWithExactArms } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the south-west corners of a Code — points whose ink leaves by south
 * and west only, drawn ┐ — as a 1×1 submatrix scan. A corner is named by the
 * two arms it carries.
 */
@Injectable()
export class SouthWestCornerCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `southWestCornerCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of corner points whose ink leaves by south and west only (┐).",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{S, W\} \,\}\right|`,
    key: "southWestCornerCount",
    name: "South-West Corner Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are south and west. */
  public compute(context: CharacteristicContext): number {
    return countPointsWithExactArms(context.matrix, ["south", "west"]);
  }
}
