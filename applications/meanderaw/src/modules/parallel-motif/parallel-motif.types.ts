// 🏷️ Types

import type { SerpentineFlip } from "../meander-generation/meander-generation.types";

/**
 * Where one repeat unit's bundle of strands sits, how many it holds, and
 * which way it opens.
 *
 * `opensUp` is the only thing that differs between one unit and the next:
 * an upward-opening bundle turns on the band's bottom border and leaves its
 * arms open at the top, a downward-opening one does the reverse, and the
 * two alternate by unit index so the band reads as ⊔⊓⊔⊓.
 */
export interface ParallelUnitPlacement {
  readonly firstColumn: number;
  readonly opensUp: boolean;
  readonly rows: number;
  readonly strands: number;
}

/** One ribbon of a `serpentine` stack as its own run is drawn: the strip it waves inside, and whether it waves upside down. */
export interface SerpentineRibbon {
  readonly isFlipped: boolean;
  readonly strip: SerpentineStrip;
}

/** One horizontal strip of the band, as the inclusive lattice rows a single `serpentine` ribbon waves between. A one-row strip has `topRow === bottomRow` and flattens to a straight rule. */
export interface SerpentineStrip {
  readonly bottomRow: number;
  readonly topRow: number;
}

/**
 * Where one `serpentine` repeat unit starts, and whether it is the one that
 * has to stop.
 *
 * Unlike {@link ParallelUnitPlacement} this carries no row count and no
 * strand count: a serpentine unit's columns are the same
 * `COLUMNS_PER_SERPENTINE_UNIT` at every ply, and the rows belong to the
 * strips rather than to the unit.
 */
export interface SerpentineUnitPlacement {
  readonly firstColumn: number;
  readonly isLastUnit: boolean;
}

/**
 * One distinct `serpentine` drawing at a given row and strand count: which
 * ribbons are turned upside down, and how far the strip depths are rotated.
 *
 * Both fields are omitted at their defaults, so the variant that rotates
 * nothing and turns nothing over carries neither field, and keeps the plain
 * `serpentine-strands-N` filename it already had.
 */
export interface SerpentineVariant {
  readonly flip?: SerpentineFlip;
  readonly offset?: number;
}
