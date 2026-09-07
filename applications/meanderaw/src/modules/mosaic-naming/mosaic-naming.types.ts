// 🏷️ Types

import type {
  MosaicSubFamily,
  MosaicTile,
} from "../mosaic-motif/mosaic-motif.types";

/**
 * How a corner tile's **lanes** read — a lane being one pair of levels its
 * southward edges join, which for a tile whose every point turns a corner is
 * the only way those edges can fall.
 *
 * `closed` when every lane repeats the columns its horizontal runs start in,
 * so each lane's ink turns back on itself and shuts into rectangles inside
 * the repeat; `stepped` when every lane offsets them instead, so each lane's
 * ink turns the opposite way at every level and walks out of the repeat into
 * the next. They are the question `rings` and `zigzag` differ on, which is
 * why it is one answer with two halves rather than two predicates.
 *
 * Both are false for a tile that *mixes* the two, closing in one lane and
 * stepping in another, and both are false for a tile with no lane at all.
 * That is what makes the two halves disjoint whatever they are asked of,
 * rather than only over the tiles a corner rule admits.
 */
export interface MosaicCornerLanes {
  readonly closed: boolean;
  readonly stepped: boolean;
}

/**
 * One rule that earns a tile a name: the name, and the predicate over the
 * tile's own structure that a tile must satisfy to be called it.
 *
 * A rule reads direction bits and nothing else — never a stored label, and
 * never a list of known identifiers — which is what lets a name keep working
 * at row and column counts nobody has enumerated. Adding a name to the
 * family is adding one of these, not writing a motif service.
 */
export interface MosaicNamingRule {
  readonly matches: (tile: MosaicTile) => boolean;
  readonly name: MosaicSubFamily;
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
export interface MosaicUnbrokenRuns {
  readonly across: boolean;
  readonly down: boolean;
}
