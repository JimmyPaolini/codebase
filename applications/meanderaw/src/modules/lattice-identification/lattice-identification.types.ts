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

/**
 * The two widths a document has to be handed before it can be addressed:
 * how far apart its repeat units sit, and how far apart two *identical*
 * units sit.
 *
 * Both come from the family that drew the document rather than from the
 * document — `MotifPitchService` answers each — which is why they arrive as
 * parameters instead of being recovered here. Recovering the span by
 * searching for the narrowest window that happens to repeat would agree with
 * every drawing by construction and so would report a drawing whose repeat
 * had grown as correct.
 *
 * {@link span} is what the address is read at and is always a whole number
 * of {@link pitch}es. {@link pitch} is not addressed at all: it is the width
 * of the band's own termination artifacts, and so the margin the addressed
 * window clears at either end.
 */
export interface LatticeUnit {
  readonly pitch: number;
  readonly span: number;
}
