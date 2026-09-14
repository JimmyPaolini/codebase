// 🏷️ Types

/**
 * Every fact `MeanderCharacteristicsService.compute` derives directly from a
 * decoded Code's grid: the four raw junction counts spec #813 asks every
 * meander row to record, and the two boolean Characteristics built from
 * them. See `MeanderCharacteristicsService`'s own doc comment for why
 * `hasBranching` and `hasCrossing` each read both the ink and the negative
 * count rather than the ink count alone.
 */
export interface MeanderCharacteristics {
  readonly hasBranching: boolean;
  readonly hasCrossing: boolean;
  readonly inkTJunctions: number;
  readonly inkXJunctions: number;
  readonly negativeTJunctions: number;
  readonly negativeXJunctions: number;
}

/**
 * A running count of three-armed and four-armed junctions — the same shape
 * `MeanderTopologyService`'s own `JunctionCounts` takes for a rendered
 * document, read here directly off a decoded Code's grid instead. A fresh
 * type rather than a reuse: this service depends on nothing from
 * `meander-topology`, and importing across for one shared shape would cost
 * more coupling than the duplication it would save.
 */
export interface MeanderJunctionCounts {
  tJunctions: number;
  xJunctions: number;
}
