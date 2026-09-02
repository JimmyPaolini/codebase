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
 */
export interface InkConnectivity {
  readonly components: number;
  readonly edges: number;
  readonly nodes: number;
}

/** A running count of three-armed and four-armed junctions, over either the ink or the white space it leaves. */
export interface JunctionCounts {
  tJunctions: number;
  xJunctions: number;
}

/**
 * The mutable sets {@link MeanderLatticeService} fills while it walks a
 * document's path data, before they are frozen into a {@link LatticeGraph}.
 */
export interface LatticeDraft {
  readonly horizontalEdges: Set<string>;
  readonly nodes: Set<string>;
  readonly verticalEdges: Set<string>;
}

/**
 * A rendered meander reduced to the grid it was drawn on. Every coordinate
 * in the corpus sits on a lattice whose pitch is two stroke widths, so the
 * whole drawing is described by which one-pitch steps carry ink.
 *
 * `columns` and `rows` are the lattice's own extent — lattice lines run
 * `0…columns` across and `0…rows` down — which makes the drawing's cells the
 * `columns × rows` squares between them.
 *
 * Every set holds `"column,row"` keys. A key in `horizontalEdges` is the
 * step from `(column, row)` to `(column + 1, row)`; one in `verticalEdges`
 * is the step from `(column, row)` to `(column, row + 1)`. `nodes` holds
 * every lattice point the document paints, including the ones a zero-length
 * stroke paints with its square line cap and nothing else.
 */
export interface LatticeGraph {
  readonly columns: number;
  readonly horizontalEdges: ReadonlySet<string>;
  readonly nodes: ReadonlySet<string>;
  readonly rows: number;
  readonly verticalEdges: ReadonlySet<string>;
}

/** One lattice point, by the lattice column and row it sits at. */
export interface LatticePoint {
  readonly column: number;
  readonly row: number;
}

/** The lattice a document's coordinates are read against: the first lattice line's offset from the canvas edge, and the distance between lattice lines. */
export interface LatticeScale {
  readonly origin: number;
  readonly pitch: number;
}

/** One run of ink along a lattice line, in lattice indices. A run may be drawn either way round, and may be zero length. */
export interface LatticeSpan {
  readonly from: number;
  readonly to: number;
}

/**
 * One rendered meander's measured topology — the charter's invariants 2, 3,
 * and 4 turned into numbers.
 *
 * `channelWidthCompliant` is invariant 2: every interior white channel is
 * exactly one stroke width. It excludes the band's first and last lattice
 * column, which is invariant 7 — a band's termination is allowed a wider
 * gap, and 2,114 of the 3,293 committed documents have one there.
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

/** One `M`, `H`, or `V` command read out of a path's `d` attribute, with the coordinates it carries. */
export type PathCommand =
  | { readonly command: "H"; readonly x: number }
  | { readonly command: "M"; readonly x: number; readonly y: number }
  | { readonly command: "V"; readonly y: number };

/** One command letter and the coordinate tokens that followed it, before either is checked against the command's own arity. */
export interface PathCommandGroup {
  readonly letter: string;
  readonly values: number[];
}
