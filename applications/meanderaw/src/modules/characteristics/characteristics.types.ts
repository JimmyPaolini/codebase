// 🏷️ Types

/**
 * Every fact `CharacteristicsService.compute` derives directly from a
 * Code: the four raw junction counts spec #813 asks every
 * meander row to record, the two boolean Characteristics built from them,
 * and the three {@link Connectivity} counts that say what shape the
 * ink is as a graph. See `CharacteristicsService`'s own doc comment
 * for why `hasBranching` and `hasCrossing` each read both the ink and the
 * negative count rather than the ink count alone.
 */
export interface Characteristics extends Connectivity {
  readonly hasBranching: boolean;
  readonly hasCrossing: boolean;
  readonly inkTJunctions: number;
  readonly inkXJunctions: number;
  readonly negativeTJunctions: number;
  readonly negativeXJunctions: number;
}

/** One edge a Code holds, named by the two points it joins — `from` and `to` are the same point for a single-column Code's wrapped eastward edge. */
export interface CodeEdge {
  readonly from: string;
  readonly to: string;
}

/**
 * One repeat's ink counted as a graph: how many connected pieces it falls
 * into, how many independent loops it closes, and how many of its points
 * carry exactly one arm.
 *
 * The same three numbers `InkConnectivity` reports for a rendered document,
 * stated over a Code instead — see
 * `ConnectivityService` for how the
 * grid is read as a repeating band and why an edge is claimed by either of
 * its ends.
 *
 * `edges` and `nodes` are deliberately absent where `InkConnectivity` has
 * them: they exist there so a caller can do the forest and tree arithmetic
 * itself, and {@link cycles} is that arithmetic already done. A family is
 * told from another by how many loops it closes rather than by the two
 * counts the number is derived from.
 */
export interface Connectivity {
  readonly components: number;
  readonly cycles: number;
  readonly freeEnds: number;
}

/**
 * A running count of three-armed and four-armed junctions, read directly
 * off a Code.
 *
 * A retired reader counted the same two kinds of junction off a *rendered*
 * document, by rebuilding a lattice from its path data. Nothing does that
 * any more: a Code is what a meander is, and measuring it does not require
 * rendering it first.
 */
export interface JunctionCounts {
  tJunctions: number;
  xJunctions: number;
}
