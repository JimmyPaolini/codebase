import { Inject, Injectable } from "@nestjs/common";

import { ConnectivityService } from "../../connectivity.service";
import { rowTouchCount } from "../path.utilities";

import type {
  CharacteristicContext,
  CharacteristicEvaluator,
  CharacteristicMetadata,
} from "../../characteristics.types";

/**
 * Counts how many times one repeat's ink touches the bottom border: the
 * separate runs of inked points along the last row, which sits against the
 * band's bottom border rule. A single-row Code touches both borders with
 * the same row.
 */
@Injectable()
export class BottomBorderTouchCountCharacteristicService implements CharacteristicEvaluator<number> {
  // 🏗 Dependency Injection

  constructor(
    @Inject(ConnectivityService)
    private readonly connectivityService: ConnectivityService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /** Names and explains `bottomBorderTouchCount` for catalogs and inspectors. */
  public readonly metadata: CharacteristicMetadata<number> = {
    category: "path",
    description:
      "The number of separate runs of ink on the last row, the row against the band's bottom border rule: inked points grouped by the edges joining them along that row, wrapping across the tile boundary.",
    formula: String.raw`\left|\text{runs}(\text{row}_{r-1})\right|`,
    key: "bottomBorderTouchCount",
    name: "Bottom Border Touch Count",
    valueType: "number",
  };

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Counts the separate runs of ink on the last row. */
  public compute(context: CharacteristicContext): number {
    return rowTouchCount(
      this.connectivityService.edges(context.matrix, false),
      context.rows - 1,
    );
  }
}
