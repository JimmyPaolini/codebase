import { Inject, Injectable } from "@nestjs/common";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts the straight vertical points of a Code — ink passing through north
 * to south and nowhere else — as a 1×1 submatrix scan.
 */
@Injectable()
export class VerticalEdgeCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(SubmatrixUtilitiesService)
    private readonly submatrixUtilitiesService: SubmatrixUtilitiesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `verticalEdgeCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "submatrix",
    description:
      "The number of points whose ink runs straight through north and south, with no east or west arm.",
    formula: String.raw`\left|\{\, p \in M : \text{arms}(p) = \{N, S\} \,\}\right|`,
    key: "verticalEdgeCount",
    name: "Vertical Edge Count",
    submatrix: { columns: 1, rows: 1 },
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the points whose only arms are north and south. */
  public compute(context: CharacteristicContext): number {
    return this.submatrixUtilitiesService.countPointsWithExactArms(
      context.matrix,
      ["north", "south"],
    );
  }
}
