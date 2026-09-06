// 🏷️ Types

/**
 * One rendered meander's ink graph counted as a graph: how many lattice
 * points carry ink, how many one-pitch steps join them, and how many
 * connected pieces the result falls into.
 *
 * These three numbers are what "the ink is a tree" is defined by, and they
 * are reported rather than judged, the same way the junction counts are.
 * Two predicates follow from them by arithmetic and nothing else:
 *
 * - **A forest** — no loops anywhere — is exactly
 *   `edges === nodes - components`. Every one of the six original families
 *   is one: their ink is a disjoint union of simple arcs, so they hold at
 *   many components.
 * - **A tree** — one connected figure with no loops — is exactly
 *   `components === 1 && edges === nodes - 1`. That is the `branch`
 *   family's own claim, and the only thing separating a tree from a forest
 *   is the component count.
 *
 * A lattice point painted by a zero-length stroke and joined to nothing is
 * a component of its own, which is why `edges` can be zero while `nodes`
 * and `components` are not.
 *
 * `freeEnds` counts the lattice points carrying exactly one arm of ink —
 * where a stroke stops rather than turning, forking, or closing. It is not
 * a charter quantity either, and it is reported here because it is what
 * separates a figure the eye follows from one it does not: closing every
 * loop in a drawing also closes every end, and a figure in which nothing
 * terminates reads as a grille rather than as a running border. A
 * zero-length stroke's lattice point has no arms at all, so it is not a
 * free end.
 */
export interface InkConnectivity {
  readonly components: number;
  readonly edges: number;
  readonly freeEnds: number;
  readonly nodes: number;
}

/** A running count of three-armed and four-armed junctions, over either the ink or the white space it leaves. */
export interface JunctionCounts {
  tJunctions: number;
  xJunctions: number;
}

/**
 * One rendered meander's measured topology — the charter's invariants 2, 3,
 * and 4 turned into numbers.
 *
 * `channelWidthCompliant` is invariant 2: every interior white channel is
 * exactly one stroke width. It excludes the band's first and last lattice
 * column, which is invariant 7 — a band's termination is allowed a wider
 * gap, and 2,120 of the 3,353 committed documents have one there — a count
 * asserted in `meander-topology.service.integration.test.ts` rather than
 * carried in prose.
 *
 * The junction counts are invariants 3 and 4, measured over both the ink and
 * the white space it leaves: a T-junction is a three-armed meeting, an
 * X-junction a four-armed one. Both are counted strictly inside the
 * document — ink that would continue past the canvas, and white that would
 * escape it, are not arms of anything this document draws.
 */
export interface MeanderTopology {
  readonly channelWidthCompliant: boolean;
  readonly inkTJunctions: number;
  readonly inkXJunctions: number;
  readonly negativeTJunctions: number;
  readonly negativeXJunctions: number;
}
