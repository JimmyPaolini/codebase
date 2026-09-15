// 🏷️ Types

import type { EdgesDraft, Tile, TileShape } from "../tile/tile.types";

/** Where one edge sits in an {@link EdgesDraft}: the grid that holds it, and its level and column within that grid. */
export interface EdgeAddress {
  readonly column: number;
  readonly grid: readonly boolean[][];
  readonly level: number;
}

/**
 * One meander the sweep found: the Code that is its whole identity, and the
 * shape that Code is read at.
 *
 * The tile it was spelled from is deliberately not carried alongside. A
 * Code, its rows, and its columns are together sufficient to reproduce
 * everything else about a meander — spec #813's own sixteenth user story —
 * so handing a caller the tile as well would hand it a second source of
 * truth for facts the Code already fixes.
 */
export interface EnumeratedMeander {
  readonly code: string;
  readonly columns: number;
  readonly rows: number;
}

/**
 * The bookkeeping `TileEnumerationService.enumerate` carries through its walk:
 * the edges decided so far, the shape being enumerated, and the distinct
 * tiles found, keyed by their class's canonical edge key.
 */
export interface TileEnumerationState {
  readonly edges: EdgesDraft;
  readonly shape: TileShape;
  readonly tilesByKey: Map<string, Tile>;
}
