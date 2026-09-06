// 🏷️ Types

import type {
  MosaicSubFamily,
  MosaicTile,
} from "../mosaic-motif/mosaic-motif.types";

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
