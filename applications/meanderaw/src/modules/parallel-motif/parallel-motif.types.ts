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
