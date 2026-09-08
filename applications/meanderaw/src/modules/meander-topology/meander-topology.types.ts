// 🏷️ Types

/**
 * An ink graph stated in the only terms counting its pieces needs: the nodes
 * that carry ink, which nodes each one reaches, and an identity for a node so
 * two arrivals at the same one are recognized as one.
 *
 * It exists because "how many connected pieces is this ink" is asked of two
 * things that share no coordinate system. A rendered document's ink lives on
 * a bounded lattice, where a node is a `"column,row"` point and a neighbor is
 * one pitch away in a straight line. A `mosaic` tile's ink lives on a repeat
 * unit, where a node is a `[level][column]` point and a step east off the last
 * column arrives at the first column of the same tile — the wrap that makes a
 * tile tile at all. Neither reading is a special case of the other, and the
 * walk that counts the pieces does not care which it is given: it needs to
 * enumerate nodes, follow them, and tell two of them apart.
 *
 * So the walk is written once, here, against those three operations, and each
 * caller keeps its own vocabulary rather than translating into a shared one
 * that would be wrong for one of them. `Node` is the caller's own point type
 * for that reason.
 */
export interface InkAdjacency<Node> {
  readonly key: (node: Node) => string;
  readonly neighbors: (node: Node) => readonly Node[];
  readonly nodes: readonly Node[];
}

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
 *   `components === 1 && edges === nodes - 1`. No family claims it and no
 *   committed document is one. Both of the corpus's routes to a tree have
 *   closed, by opposite arithmetic: `parallel`'s one-strand serpentine was a
 *   path that never ended before the band did, and a rule at each end closes
 *   a loop through it, so it gained an edge. `branch` drew a spanning tree
 *   while one of its borders was open, and its rules now stand a lattice row
 *   clear of the ink, so each rule is a component of its own and the drawing
 *   is a forest of two or three pieces. A figure with a loop is not a tree,
 *   and neither is one in pieces.
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
 * gap, and 6,005 of the 9,863 committed documents have one there — a count
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
