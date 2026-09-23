// 🏷️ Types

import type { Characteristics } from "../characteristics/characteristics.types";

/**
 * Every family a meander can be classified into, or unclassified if none matches.
 */
export type MeanderFamily =
  | "boxes"
  | "branch"
  | "chain"
  | "clasps"
  | "cross"
  | "parallel"
  | "snake"
  | "swirl"
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
