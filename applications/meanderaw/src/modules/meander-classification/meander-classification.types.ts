// 🏷️ Types

import type { MeanderCharacteristics } from "../meander-characteristics/meander-characteristics.types";
import type { MosaicSubFamily } from "../mosaic-tile/mosaic-tile.types";

/** What one tile's structure earns: the family it belongs to and the named region of the space it sits in, each `undefined` where it earns none. */
export interface MeanderClassification {
  readonly family: MeanderType | undefined;
  readonly subFamily: MosaicSubFamily | undefined;
}

/**
 * One family's defining combination, as a predicate over a tile's
 * {@link MeanderStructure} rather than over the parameters that drew it.
 *
 * The shape mirrors `MosaicNamingRule` deliberately: both are predicates
 * over the lattice, one naming a region of the space and one naming a
 * family, and keeping them the same shape is what says they are the same
 * kind of thing.
 */
export interface MeanderFamilyRule {
  readonly matches: (structure: MeanderStructure) => boolean;
  readonly name: MeanderType;
}

/** How wide and how deep one repeat is — the two numbers a family's pitch rule is stated against. */
export interface MeanderShape {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Everything a family rule may read: the tile's measured Characteristics,
 * its shape, and the named region of the `mosaic` unit space it earns, where
 * it earns one.
 *
 * `subFamily` is in here rather than beside it because one family's own
 * definition is stated in terms of it — see `MeanderClassificationService`'s
 * `mosaic` rule — while every other family's is stated without it. A rule
 * reading a fact no other rule reads is still a rule over the same
 * structure.
 */
export interface MeanderStructure extends MeanderShape {
  readonly characteristics: MeanderCharacteristics;
  readonly subFamily?: MosaicSubFamily | undefined;
}

/**
 * A meander's family.
 *
 * It lives here, beside the rules that decide it, because deciding it is now
 * all a family is. The ten names were once the dispatch key of nine
 * per-family procedural motif services plus `mosaic`'s enumerated tiles, and
 * they lived in the module that did that dispatching; with those retired, a
 * family is a combination of Characteristics a meander's own structure
 * either satisfies or does not — see {@link MeanderFamilyRule} — and a
 * meander that satisfies none carries no family at all.
 */
export type MeanderType =
  | "boxes"
  | "branch"
  | "chain"
  | "cross"
  | "mosaic"
  | "negative"
  | "parallel"
  | "snake"
  | "swirl"
  | "whirl";
