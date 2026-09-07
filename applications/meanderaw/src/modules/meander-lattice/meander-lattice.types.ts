// 🏷️ Types

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
