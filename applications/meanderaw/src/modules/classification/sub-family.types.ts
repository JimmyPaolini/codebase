// 🏷️ Types

import type { Tile } from "../tile/tile.types";

/**
 * How a corner tile's **lanes** read — a lane being one pair of levels its
 * southward edges join, which for a tile whose every point turns a corner is
 * the only way those edges can fall.
 *
 * `closed` when every lane repeats the columns its horizontal runs start in,
 * so each lane's ink turns back on itself and shuts into squares inside
 * the repeat; `stepped` when every lane offsets them instead, so each lane's
 * ink turns the opposite way at every level and walks out of the repeat into
 * the next. They are the question `square` and `zigzag` differ on, which is
 * why it is one answer with two halves rather than two predicates.
 *
 * Both are false for a tile that *mixes* the two, closing in one lane and
 * stepping in another, and both are false for a tile with no lane at all.
 * That is what makes the two halves disjoint whatever they are asked of,
 * rather than only over the tiles a corner rule admits.
 */
export interface CornerLanes {
  readonly closed: boolean;
  readonly stepped: boolean;
}

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
 * Every one had a constructor as well as a predicate until the constructors
 * retired with the procedural pipeline. `diamond` names the same shape the
 * `split` **modifier** constructs, and both names survive because they play
 * different roles: `split` is a constructor into the unit space, `diamond` a
 * predicate over it. Nothing about the `split` modifier or its reference
 * asset changes.
 */
export type SubFamily =
  | "bars"
  | "dashes"
  | "diamond"
  | "dots"
  | "lines"
  | "mesh"
  | "square"
  | "zigzag";

/**
 * One rule that earns a tile a name: the name, and the predicate over the
 * tile's own structure that a tile must satisfy to be called it.
 *
 * A rule reads direction bits and nothing else — never a stored label, and
 * never a list of known identifiers — which is what lets a name keep working
 * at row and column counts nobody has enumerated. Adding a name to the
 * family is adding one of these, not writing a motif service.
 */
export interface SubFamilyRule {
  readonly matches: (tile: Tile) => boolean;
  readonly name: SubFamily;
}

/**
 * Whether a tile's runs are unbroken in each direction: `across` when every
 * eastward edge is drawn, so each level is one continuous rule, and `down`
 * when every southward edge is, so each column is one continuous bar.
 *
 * It is the question `lines` and `dashes` differ on, and `bars` and
 * `diamond` differ on, which is why it is one answer with two halves rather
 * than two predicates.
 */
export interface UnbrokenRuns {
  readonly across: boolean;
  readonly down: boolean;
}
