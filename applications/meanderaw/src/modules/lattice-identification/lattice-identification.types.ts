// 🏷️ Types

import type { MosaicSubFamily } from "../mosaic-tile/mosaic-tile.types";

/**
 * What one rendered document is, said on the lattice every family is drawn
 * on: how deep its band runs, how wide its true repeat is, and the
 * hexadecimal string spelling out the repeat unit's own points.
 *
 * {@link address} is the name. It is literal rather than folded, so two
 * drawings of one pattern started at different levels keep different names —
 * which is what lets `snake plain` and `snake flip` stay distinguishable.
 * {@link canonicalIdentifier} is reported beside it and never in place of
 * it: that is the one string a whole symmetry class shares, and so the one
 * that can state two families drawing the same pattern.
 *
 * {@link subFamily} is absent rather than approximated when a tile's
 * structure earns no name, which is nearly always. A name that everything
 * has says nothing, and the family a drawing belongs to is not it — the
 * earned name is a property of the ink alone, so a `parallel` reading as
 * `zigzag` is a discovery rather than a reclassification.
 */
export interface LatticeAddress {
  readonly address: string;
  readonly canonicalIdentifier: string;
  readonly columns: number;
  readonly identifier: string;
  readonly rows: number;
  readonly subFamily?: MosaicSubFamily;
}
