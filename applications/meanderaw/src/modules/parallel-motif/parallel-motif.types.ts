// 🏷️ Types

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
