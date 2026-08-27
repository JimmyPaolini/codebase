// 🏷️ Types

/**
 * The mutable bookkeeping {@link MosaicTilesService.enumerate} carries
 * through its search: which cells are already claimed, the pieces placed so
 * far, and the distinct tiles found, keyed by canonical identifier.
 */
export interface MosaicCoverState {
  readonly claimed: boolean[];
  readonly columns: number;
  readonly pieces: MosaicPiece[];
  readonly rows: number;
  readonly tilesByIdentifier: Map<string, MosaicTile>;
}

/**
 * What one cell of a {@link MosaicTile} draws. A `"dot"` is a zero-length
 * square mark on its own cell; a `"vertical"` dash spans its cell and the
 * one a grid level below it; a `"horizontal"` dash spans its cell and the
 * one a column to its right, wrapping into the next repeat tile from the
 * last column; a `"line"` is the single-column tile's degenerate horizontal
 * dash, which chains with its own copy in the next tile into one continuous
 * rule across the pattern.
 */
export type MosaicMarkKind = "dot" | "horizontal" | "line" | "vertical";

/**
 * One mark in a {@link MosaicTile}, anchored at the cell it is drawn from.
 * `level` indexes the tile's interior levels from `0`, so the grid level it
 * sits on is `level + 1` — grid level `0` and `rows` belong to the two cap
 * ticks, not to the tile.
 */
export interface MosaicPiece {
  readonly column: number;
  readonly kind: MosaicMarkKind;
  readonly level: number;
}

/**
 * One repeat tile of the `mosaic` family: a `columns` by `rows - 1` grid of
 * cells, each covered exactly once by a dot or by one half of a dash. That
 * exact-cover rule is what makes every mosaic space-filling for free —
 * every cell carries ink, and neighboring cells sit one grid unit apart, so
 * no blank is ever wider than the stroke. `bars split`, `dots`, `dashes`,
 * and `lines` are all members of this one family.
 */
export interface MosaicTile {
  readonly columns: number;
  readonly pieces: readonly MosaicPiece[];
  readonly rows: number;
}

/**
 * Which repeat unit of a {@link MosaicTile} `MosaicTileMotifService.path`
 * draws. Grouped into one object rather than passed alongside the tile so
 * the method stays inside the workspace's parameter limit, and so
 * `isLastUnit` reads the same here as it does in `MotifUnit`.
 */
export interface MosaicTileUnit {
  readonly isLastUnit: boolean;
  readonly unitIndex: number;
}
