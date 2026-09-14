// 🏷️ Types

/**
 * Every fact `MeanderCharacteristicsService.compute` derives directly from a
 * decoded Code's grid: the four raw junction counts spec #813 asks every
 * meander row to record, the two boolean Characteristics built from them,
 * and the three {@link MeanderConnectivity} counts that say what shape the
 * ink is as a graph. See `MeanderCharacteristicsService`'s own doc comment
 * for why `hasBranching` and `hasCrossing` each read both the ink and the
 * negative count rather than the ink count alone.
 */
export interface MeanderCharacteristics extends MeanderConnectivity {
  readonly hasBranching: boolean;
  readonly hasCrossing: boolean;
  readonly inkTJunctions: number;
  readonly inkXJunctions: number;
  readonly negativeTJunctions: number;
  readonly negativeXJunctions: number;
}

/**
 * One repeat's ink counted as a graph: how many connected pieces it falls
 * into, how many independent loops it closes, and how many of its points
 * carry exactly one arm.
 *
 * The same three numbers `InkConnectivity` reports for a rendered document
 * and `MosaicConnectivityService` reports for a `mosaic` tile, stated over a
 * decoded Code's grid instead — see `MeanderConnectivityService` for how the
 * grid is read as a repeating band and why an edge is claimed by either of
 * its ends.
 *
 * `edges` and `nodes` are deliberately absent where `InkConnectivity` has
 * them: they exist there so a caller can do the forest and tree arithmetic
 * itself, and {@link cycles} is that arithmetic already done. A family is
 * told from another by how many loops it closes rather than by the two
 * counts the number is derived from.
 */
export interface MeanderConnectivity {
  readonly components: number;
  readonly cycles: number;
  readonly freeEnds: number;
}

/** One edge of a decoded grid, named by the two points it joins — `from` and `to` are the same point for a single-column grid's wrapped eastward edge. */
export interface MeanderGridEdge {
  readonly from: string;
  readonly to: string;
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
