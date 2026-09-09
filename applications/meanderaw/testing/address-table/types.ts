// 🏷️ Types

import type { MosaicSubFamily } from "../../src/modules/mosaic-tile/mosaic-tile.types";

/**
 * One committed drawing and everything the table says about it.
 *
 * {@link path} is not a column. It is the drawing's identity while the sweep
 * is running — two drawings of one family may agree on every column and still
 * be two files — so it carries the failure messages and decides the reading
 * order, and is dropped when the row is written.
 *
 * {@link variant} is what the drawing is filed under within its family and
 * row count: the modifier's slug for a family drawn from a motif, and the
 * tile's own name in the two enumerated halves — all of `mosaic` and
 * `negative`'s `permutations/` subtree — whose drawings have no modifier at
 * all. Two *halves* rather than two families: `negative`'s other hundred
 * drawings carry a real modifier slug.
 */
export interface AddressedDrawing {
  readonly address: string;
  readonly canonicalIdentifier: string;
  readonly family: string;
  readonly path: string;
  readonly rows: number;
  readonly span: number;
  readonly subFamily?: MosaicSubFamily;
  readonly variant: string;
}

/**
 * Which way a run goes: comparing the committed block against a fresh sweep,
 * or replacing it with one.
 *
 * There is no default. A run that silently wrote when it was asked to check
 * would rewrite the very thing it was meant to hold to account, which is the
 * failure mode the pairing exists to prevent.
 */
export type AddressTableRunMode = "check" | "write";
