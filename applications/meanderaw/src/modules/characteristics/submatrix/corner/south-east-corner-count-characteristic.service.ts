import { Injectable } from "@nestjs/common";

import { countPointsWithExactArms } from "../submatrix.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the south-east corners of a Code — points whose ink leaves by south and east only, drawn ┌ — as a 1×1 submatrix scan. A corner is named by the two arms it carries.
 */
@Injectable()
export class SouthEastCornerCountCharacteristicService implements CharacteristicEvaluator {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `southEastCornerCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of corner points whose ink leaves by south and east only (┌).",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{S, E\} \,\}\right|`,
    key: "southEastCornerCount",
    name: "South-East Corner Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are south and east. */
  public compute(context: CharacteristicContext): number {
    return countPointsWithExactArms(context.matrix, ["east", "south"]);
  }
}
