// 🏷️ Types

/**
 * The four bits one point of a {@link MosaicTile} carries: whether ink
 * leaves it north, south, east, or west. `0000` is a dot, `1100` a corner,
 * `1110` a T-junction, `1111` a crossing.
 *
 * The bits are twice-redundant by design, and the redundancy is
 * `MosaicTileService`'s checked invariant rather than a tolerated cost:
 * `east` at one point is `west` at the point to its right, wrapping from
 * the last column into the next repeat, and `south` is `north` at the point
 * below. That agreement is what makes a tile's bits denote exactly one
 * drawing — no two assignments draw the same pattern, and no assignment
 * draws none — and the east–west wrap at the last column **is** what makes
 * a tile join up with its own next repeat, stated once here rather than
 * handled wherever a dash used to reach past the tile's edge.
 */
export interface MosaicDirections {
  readonly east: boolean;
  readonly north: boolean;
  readonly south: boolean;
  readonly west: boolean;
}

/** Where one edge sits in a {@link MosaicEdgesDraft}: the grid that holds it, and its level and column within that grid. */
export interface MosaicEdgeAddress {
  readonly column: number;
  readonly grid: readonly boolean[][];
  readonly level: number;
}

/**
 * A tile's edges, held once each rather than twice. `horizontal[level]` runs
 * `0…columns - 1`, indexed by every interior level; `vertical[level]`
 * likewise, indexed by every level that has one below it.
 *
 * This is the form a tile is built from and folded in, because it is the
 * one whose entries are exactly the tile's own degrees of freedom: a shape
 * holds `2^(columns * (2 * rows - 3))` tiles, which is this structure's own
 * size. {@link MosaicDirections} is the form a tile is read in.
 */
export interface MosaicEdges {
  readonly horizontal: readonly (readonly boolean[])[];
  readonly vertical: readonly (readonly boolean[])[];
}

/**
 * A tile's edges while they are still being filled in, before
 * `MosaicTileService.build` freezes them into a tile. Same shape as
 * {@link MosaicEdges}, with the rows left mutable so a caller can mark one
 * edge at a time rather than computing every entry up front.
 */
export interface MosaicEdgesDraft {
  readonly horizontal: boolean[][];
  readonly vertical: boolean[][];
}

/**
 * The bookkeeping `MosaicTilesService.enumerate` carries through its walk:
 * the edges decided so far, how many of them each point is touched by, the
 * shape being enumerated, and the distinct tiles found, keyed by canonical
 * identifier.
 *
 * `incident` is indexed `level × columns + column`, and it is the whole
 * reason the walk is fast: it lets a partial assignment be refused the
 * moment it exceeds the ceiling, rather than completed and then discarded.
 */
export interface MosaicEnumeration {
  readonly edges: MosaicEdgesDraft;
  readonly incident: number[];
  readonly shape: MosaicTileShape;
  readonly tilesByIdentifier: Map<string, MosaicTile>;
}

/** One lattice point's position on the canvas, in pixels, as `MosaicTileMotifService` draws from it. */
export interface MosaicLatticePoint {
  readonly x: number;
  readonly y: number;
}

/**
 * How a point is reached, ranked in the order the family's original
 * exact-cover search discovered covers in: `0` a bare point, `1` one
 * anchoring a southward edge, `2` one anchoring an eastward edge, `3` one
 * reached only by a neighbor's edge.
 *
 * A union rather than a plain number so the letter and the rank cannot come
 * apart: {@link MosaicPointLetters} has exactly one entry per rank, and
 * indexing it with this needs no fallback for a rank that does not exist.
 */
export type MosaicPointRank = 0 | 1 | 2 | 3;

/**
 * A named, recognizable region of the `mosaic` family's unit space — a
 * **sub-family** in the repository glossary's sense, arrived at by
 * recognizing a structural property of a tile rather than by applying a
 * modifier. Each one is the set of tiles whose every point is reached the
 * same way: `dots` where no point carries ink at all, `lines` where a
 * single column's points all carry the wrapped east–west rule, `dashes`
 * where every point anchors or receives an eastward step, and `diamond`
 * where every point anchors or receives a southward one. A tile mixing them
 * belongs to no sub-family and is left unnamed rather than forced into the
 * nearest one.
 *
 * `diamond` names the same shape the `split` **modifier** constructs, and
 * both names survive because they play different roles: `split` is a
 * constructor into the unit space, `diamond` a predicate over it. Nothing
 * about the `split` modifier or its reference asset changes.
 */
export type MosaicSubFamily = "dashes" | "diamond" | "dots" | "lines";

/**
 * How to build the tile a {@link MosaicSubFamily} is named for: the column
 * span its edges need to fill a level on their own, the direction each of
 * those edges leaves its point by, and how many levels one edge accounts
 * for. A `levelStep` above one is what makes a sub-family unavailable at
 * some row counts — `diamond`'s southward edges span levels in pairs, so an
 * interior with an odd number of levels has no `diamond` tile at all.
 *
 * `direction` is `undefined` for `dots`, whose tile carries no edge at all.
 *
 * `dashes` spans two columns because an eastward edge reaches the point to
 * its right, so at a single column that edge wraps onto its own point and
 * draws the continuous rule `lines` is named for instead.
 */
export interface MosaicSubFamilyShape {
  readonly columns: number;
  readonly direction: "east" | "south" | undefined;
  readonly levelStep: number;
}

/**
 * One repeat tile of the `mosaic` family: a `columns` by `rows - 1` grid of
 * lattice points, each carrying the four direction bits that say where ink
 * leaves it. The two border rules at grid levels `0` and `rows` are the cap
 * ticks rather than tile points, so a point at the first level carries no
 * `north` and one at the last carries no `south`.
 *
 * A point on no edge at all *is* an inked dot, which is what makes every
 * mosaic space-filling for free: every point carries ink, and neighboring
 * points sit one grid unit apart, so no blank is ever wider than the
 * stroke. `bars split`, `dots`, `dashes`, and `lines` are all members of
 * this one family.
 *
 * `points` is indexed `[level][column]`, `level` running `0…rows - 2`.
 */
export interface MosaicTile {
  readonly columns: number;
  readonly points: readonly (readonly MosaicDirections[])[];
  readonly rows: number;
}

/** Which point of a tile is being talked about, grouped into one object so a method naming it stays inside the workspace's parameter limit. */
export interface MosaicTilePoint {
  readonly column: number;
  readonly level: number;
}

/** The size of a tile, apart from anything drawn on it: how deep a band one repeat spans, and how many columns. */
export interface MosaicTileShape {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Which repeat unit of a {@link MosaicTile} `MosaicTileMotifService.path`
 * draws. Grouped into one object rather than passed alongside the tile so
 * the method stays inside the workspace's parameter limit, and so
 * `isLastUnit` reads the same here as it does in `MotifUnit`.
 */
export interface MosaicTileUnit {
  readonly isLastUnit: boolean;
  readonly unitIndex: number;
}

/** One group element, plus the shape it is acting on and which of a tile's two edge directions is being moved. */
export interface MosaicTransform extends MosaicTransformChoice {
  readonly columns: number;
  readonly isHorizontal: boolean;
  readonly rows: number;
}

/** One element of the symmetry group `MosaicSymmetryService` folds a tile by: a column shift, optionally mirrored, optionally flipped. */
export interface MosaicTransformChoice {
  readonly flip: boolean;
  readonly mirror: boolean;
  readonly shift: number;
}
