// 🏷️ Types

/**
 * One column-and-level-range run of a `mosaic` zigzag, produced by
 * {@link MotifTransformsService.alternate}: `column` is `0` for a repeat
 * unit's own column and `1` for its neighbor.
 */
export interface AlternateRun extends MotifLevelSpan {
  readonly column: 0 | 1;
}

/** Mutable in-progress bounds of the inward spiral `boxes` traces, in grid levels rather than pixels. */
export interface BoxesSpiralBounds {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/**
 * Which shape `mosaic`'s `dot` modifier's per-phase level sequence follows:
 * `"bounce"` mirrors back up before repeating (a triangle wave), `"up"`
 * steps straight down through every level once per period, then resets (a
 * staircase). See {@link MotifTransformsService.dotLevels}.
 */
export type DotShape = "bounce" | "up";

/** The type, rows, repeat count, and optional modifier needed to generate one meander. */
export interface GenerationParameters {
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
  readonly type: MeanderType;
}

/** The derived grid unit, offset, and stroke width every motif is drawn against. */
export interface GridGeometry {
  readonly height: number;
  readonly offset: number;
  readonly strokeWidth: number;
  readonly unit: number;
}

/** A meander's base repeating motif shape. */
export type MeanderType =
  | "boxes"
  | "chain"
  | "mosaic"
  | "snake"
  | "swirl"
  | "whirl";

/**
 * Which line a `mirror` transform reflects a point sequence across, both
 * running through the sequence's own center point: `"horizontal"` reflects
 * over a horizontal line (an up/down flip, negating the y distance from
 * center), `"vertical"` reflects over a vertical line (a left/right flip,
 * negating the x distance from center).
 */
export type MirrorAxis = "horizontal" | "vertical";

/**
 * A named, composable adjustment applied to a meander's repeating motif.
 * Only add a union member in the task that implements it — an unimplemented
 * member would be dead code no `COMPATIBLE_MODIFIERS` entry could point to.
 */
export type Modifier =
  | { readonly name: "alternated"; readonly period: number }
  | { readonly name: "dot"; readonly shape: DotShape }
  | { readonly name: "edge" }
  | { readonly name: "edge-flip" }
  | { readonly name: "flip" }
  | { readonly name: "spin" }
  | { readonly name: "spin-flip" }
  | { readonly name: "split" };

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
 * `isLastUnit` reads the same here as it does in {@link MotifUnit}.
 */
export interface MosaicTileUnit {
  readonly isLastUnit: boolean;
  readonly unitIndex: number;
}

/** A point in the transforms layer expressed as `[xLevel, yLevel]` grid levels, not yet converted to pixel coordinates. */
export type MotifLevelPoint = readonly [number, number];

/**
 * A stretch of one column, in grid levels rather than pixels. `fromLevel`
 * equal to `toLevel` is a legal, zero-length span: `stroke-linecap="square"`
 * renders it as a small square mark rather than nothing.
 */
export interface MotifLevelSpan {
  readonly fromLevel: number;
  readonly toLevel: number;
}

/**
 * The per-type contract `MeanderGenerationService` dispatches through:
 * every type draws its repeat units with `path` and reports how far right
 * the last one extends with `rightEdge`. `border` is optional because only
 * `boxes` draws a single shared border path across the whole pattern —
 * `chain` and `snake` draw their own top/bottom border segment as part of
 * each unit's own `path` instead.
 */
export interface MotifService {
  border?(geometry: GridGeometry, pattern: RepeatPatternOptions): string;
  path(geometry: GridGeometry, unit: MotifUnit): string;
  rightEdge(geometry: GridGeometry, pattern: RepeatPatternOptions): number;
}

/**
 * Which repeat unit a motif service's `path` draws and the modifier (if
 * any) applied to it. `isLastUnit` is what lets a type whose central motif
 * stops short of its own unit pitch clip the final unit's border flush with
 * that motif, instead of trailing a stub off the end of the pattern with no
 * following unit to fill the gap. That is `mosaic`, `swirl`, and `whirl`
 * always, and `snake` and `chain` under the `edge` family, whose widened
 * pitch reaches a level past their zigzag.
 */
export interface MotifUnit {
  readonly isLastUnit: boolean;
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly unitIndex: number;
}

/** Every field here is already formatted for direct interpolation into SVG markup. */
export interface RenderOptions {
  readonly height: string;
  readonly paths: readonly string[];
  readonly strokeWidth: string;
  readonly width: string;
}

/** The row count, repeat count, and optional modifier a whole pattern's shared geometry (right edge, border) is computed from. */
export interface RepeatPatternOptions {
  readonly modifier?: Modifier;
  readonly repeatCount: number;
  readonly rows: number;
}

/**
 * The row count, optional modifier, and horizontal offset one repeat unit's
 * own border segment is drawn against. `isLastUnit` clips the segment flush
 * with the central motif's own rightmost point. Whether that changes the
 * segment depends on the type and modifier: it does wherever the motif
 * stops short of the unit pitch, and where the two already agree both
 * branches draw the same thing.
 */
export interface UnitBorderOptions {
  readonly isLastUnit: boolean;
  readonly modifier?: Modifier;
  readonly rows: number;
  readonly xOffset: number;
}
