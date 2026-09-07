// 🏷️ Types

/**
 * The sub-families `MosaicSubFamilyService` can build the aligned tile for,
 * and so the ones `--sub-family` offers.
 *
 * Every {@link MosaicSubFamily} name, which it was not always: `mesh` and
 * `zigzag` were predicates without constructors while the shape table could
 * only say "one direction's edges, anchored in the first column". Neither is
 * that. `mesh` uses both directions at once and `zigzag` needs its
 * horizontal edges to move a column along at every level, so the two arrived
 * together with the {@link MosaicEdgeRule} pair that can state them —
 * see {@link MosaicSubFamilyShape}.
 *
 * `square` arrived for free once `zigzag` had a phase: it is the identical
 * pair of rules with {@link MosaicEdgeRule.phased} off, which is the whole of
 * the difference between a staircase and a stack of closed squares. That
 * the two names are one boolean apart is the strongest evidence the split
 * between them is real rather than a distinction drawn over a region nobody
 * could tell apart.
 */
export type MosaicBuildableSubFamily =
  | "bars"
  | "dashes"
  | "diamond"
  | "dots"
  | "lines"
  | "mesh"
  | "square"
  | "zigzag";

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
 * How one of a tile's two edge grids is filled in, as the periodicity of the
 * edges in it: an edge every `levelStep` levels, and within a marked level
 * every `columnStep` columns, with `phased` advancing that column offset by
 * one per level.
 *
 * Two of these describe every buildable sub-family's aligned tile between
 * them, and the pairs the family is named in fall out of one number each.
 * `bars` and `diamond` are the same grid at `levelStep` 1 and 2 — an
 * unbroken bar and a dashed one. `lines` and `dashes` are the same grid at
 * `columnStep` 1 and 2 — a continuous rule and a broken one. `mesh` is both
 * grids at every step of one, which is every edge there is.
 *
 * `phased` is the one field that is a whole sub-family by itself. `zigzag`
 * and `square` are the same two rules and differ in nothing else: both close
 * every point into a corner, and a fixed column offset lets the ink turn back
 * on itself and close into a square inside the repeat, while advancing
 * that offset by one column per level makes each level's horizontal run start
 * where the one above it ended, so the ink turns the opposite way at every
 * level and walks sideways through the repeats. `zigzag` is the one with the
 * phase on and `square` the one with it off, which is why the field is a
 * boolean on the rule rather than a special case in whatever built the
 * staircase.
 */
export interface MosaicEdgeRule {
  readonly columnStep: number;
  readonly levelStep: number;
  readonly phased: boolean;
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
 * the edges decided so far, the shape being enumerated, and the distinct
 * tiles found, keyed by canonical identifier.
 */
export interface MosaicEnumeration {
  readonly edges: MosaicEdgesDraft;
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
 * modifier.
 *
 * Eight of them, in four pairs. Ink running **across** the band is either
 * unbroken at every level (`lines`) or broken somewhere (`dashes`); ink
 * running **down** it is either unbroken in every column (`bars`) or broken
 * somewhere (`diamond`) — a `diamond` being a *dashed* bar, which is the
 * distinction that makes those two different names rather than one. `dots`
 * and `mesh` are the two ends of the space, the tile with no edge and the
 * tile with every edge.
 *
 * `zigzag` and `square` are the fourth pair, and the only one about a point's
 * own *shape*: every point turns a corner in both. What separates them is
 * where each level's horizontal runs sit relative to the level above. Offset
 * by a column, the ink turns the opposite way at every level and walks
 * sideways out of the repeat and into the next — a staircase, and the closest
 * thing here to the fret the project is named after. Repeated in the same
 * columns, the ink turns back on itself and closes inside the repeat, so the
 * drawing is a row of separated square loops with a gap between each
 * repeat and the next. They were one name until the drawings were looked at,
 * and `README.md` works through why the ink's own component count cannot tell
 * them apart.
 *
 * A tile matching none of them is left unnamed rather than forced into the
 * nearest, which is nearly all of them — and now includes a corner tile that
 * *mixes* the two readings, stepping in one pair of levels and closing in
 * another. That is neither name rather than the nearer one, which is the same
 * stance a tile mixing horizontal and vertical ink already got.
 *
 * Every one has a constructor as well as a predicate — see
 * {@link MosaicBuildableSubFamily}. `diamond` names the same shape the
 * `split` **modifier** constructs, and both names survive because they play
 * different roles: `split` is a constructor into the unit space, `diamond` a
 * predicate over it. Nothing about the `split` modifier or its reference
 * asset changes.
 */
export type MosaicSubFamily =
  | "bars"
  | "dashes"
  | "diamond"
  | "dots"
  | "lines"
  | "mesh"
  | "square"
  | "zigzag";

/**
 * How to build the tile a {@link MosaicSubFamily} is named for: the column
 * span its edges need to state themselves in, and one
 * {@link MosaicEdgeRule} per edge grid — `undefined` where the sub-family
 * uses no edge of that direction at all, which is both of them for `dots`.
 *
 * It is a rule per grid rather than one direction and one level step
 * because a sub-family may use both directions at once. `mesh` uses every
 * edge of both, and `zigzag` and `square` each need a southward rule and an
 * eastward rule that disagree about their periods — pairs of levels down,
 * alternate columns across — which a single direction cannot say.
 *
 * A `levelStep` above one is what makes a sub-family unavailable at some row
 * counts, since a rule has to close on the interior it fills rather than run
 * off the end of it. `diamond`'s southward edges span levels in pairs, so an
 * interior with an odd number of levels has no `diamond` tile at all, and
 * `zigzag` and `square` inherit exactly that constraint from the southward
 * rule all three share: every point turning a corner forces the southward
 * edges to alternate level by level, which only lands on the last level when
 * the number of them is even.
 *
 * `columns` is a consequence of the rules rather than an independent knob: a
 * `columnStep` of two needs two columns to be two columns wide. `dashes`
 * spans two for that reason — an eastward edge reaches the point to its
 * right, so at a single column it wraps onto its own point and draws the
 * continuous rule `lines` is named for instead — and `zigzag` and `square`
 * span two for the same reason read the other way, since their horizontal
 * bits have to alternate around the repeat and an odd number of columns
 * cannot alternate and still join up with itself.
 */
export interface MosaicSubFamilyShape {
  readonly columns: number;
  readonly horizontal: MosaicEdgeRule | undefined;
  readonly vertical: MosaicEdgeRule | undefined;
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
