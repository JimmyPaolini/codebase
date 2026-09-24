// 🏷️ Types

import type { Characteristics } from "../characteristics/characteristics.types";

/**
 * Every family a meander can be classified into, or unclassified if none matches.
 */
export type MeanderFamily =
  | "arcade"
  | "bars"
  | "boxes"
  | "chain"
  | "clasps"
  | "comb"
  | "cross"
  | "dots"
  | "fork"
  | "lines"
  | "mesh"
  | "parallel"
  | "snake"
  | "stipple"
  | "swirl"
  | "tree"
  | "unclassified"
  | "whirl";

/**
 * One family's defining combination, as a predicate over a tile's
 * structure rather than over the parameters that drew it.
 */
export interface MeanderFamilyRule {
  readonly matches: (structure: MeanderStructure) => boolean;
  readonly name: MeanderFamily;
}

/** How wide and how deep one repeat is. */
export interface MeanderShape {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Everything a family rule reads: the tile's measured Characteristics and its shape.
 */
export interface MeanderStructure extends MeanderShape {
  readonly characteristics: Characteristics;
}
