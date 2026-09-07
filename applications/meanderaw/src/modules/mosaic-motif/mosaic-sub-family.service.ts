import { Inject, Injectable } from "@nestjs/common";

import { MOSAIC_SUB_FAMILY_SHAPES } from "./mosaic-motif.constants";
import { MosaicTileService } from "./mosaic-tile.service";

import type {
  MosaicBuildableSubFamily,
  MosaicEdgeRule,
  MosaicTile,
} from "./mosaic-motif.types";

/**
 * Builds the tile each named region of the `mosaic` family's unit space is
 * named for.
 *
 * This is the constructor into the space; `MosaicNamingService` is the
 * predicate over it. Keeping them apart is what lets `diamond` and `split`
 * both survive as names for the same shape: `split` is a modifier that
 * constructs one, `diamond` a rule that recognizes one, and neither is
 * derivable from the other.
 *
 * A region holds many tiles, so what is built here is the region's aligned
 * representative rather than its only member — every rule anchored in the
 * tile's first column, which for `zigzag`'s phased rule means its first
 * level is anchored there and the levels below it walk one column at a time.
 * {@link MosaicNamingService.name} names it back.
 */
@Injectable()
export class MosaicSubFamilyService {
  // 🏗 Dependency Injection

  constructor(
    @Inject(MosaicTileService)
    private readonly mosaicTileService: MosaicTileService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether a rule's level period divides the interior it has to fill, which
   * is the whole of what makes a sub-family exist at one row count and not
   * at another.
   *
   * A rule that does not close would put its last edge somewhere other than
   * the last level it is responsible for, and the tile it drew would be some
   * other sub-family with a defect at one end rather than a smaller member
   * of this one — so the honest answer is that the region is empty here. A
   * grid with no rule closes trivially, which is why `dots` exists at every
   * row count that has an interior at all.
   *
   * `levels` is the interior's level count for both grids, including the
   * southward one, which is a level shallower. A southward edge is named for
   * the level it leaves rather than the pair it joins, so a period of two
   * lands on the last interior level exactly when the number of them is
   * even — the grid's own depth would answer the opposite question.
   */
  private closes(rule: MosaicEdgeRule | undefined, levels: number): boolean {
    return rule === undefined || levels % rule.levelStep === 0;
  }

  /** One of a tile's two edge grids, `levels` deep, with every edge its rule calls for marked and nothing else. */
  private grid(
    rule: MosaicEdgeRule | undefined,
    levels: number,
    columns: number,
  ): boolean[][] {
    return Array.from({ length: Math.max(levels, 0) }, (_level, level) =>
      Array.from({ length: columns }, (_column, column) =>
        this.marks(rule, level, column),
      ),
    );
  }

  /**
   * Whether a rule puts an edge at one address of its own grid: on a level
   * its period lands on, and in a column its period lands on once the
   * level's phase has moved that period along.
   *
   * The phase is added to the column rather than subtracted from it, so a
   * phased rule still anchors its first level in the tile's first column and
   * only the levels below it walk — which keeps the aligned representative
   * aligned in the sense every other sub-family means it.
   */
  private marks(
    rule: MosaicEdgeRule | undefined,
    level: number,
    column: number,
  ): boolean {
    if (rule === undefined) {
      return false;
    }

    const phase = rule.phased ? level : 0;

    return (
      level % rule.levelStep === 0 && (column + phase) % rule.columnStep === 0
    );
  }

  // 🌎 Public Methods

  /**
   * The tile a sub-family is named for at `rows`, or `undefined` where the
   * sub-family names no tile at that row count at all — `diamond` and
   * `zigzag` over an interior with an odd number of levels, and any
   * sub-family below one interior level.
   *
   * A region can hold many tiles: `dashes` covers every arrangement of
   * eastward edges, staggered ones included. This returns the aligned
   * representative, every rule anchored in the tile's first column, which
   * is the one the region is named after. `MosaicNamingService.name` names
   * it back.
   */
  tile(
    subFamily: MosaicBuildableSubFamily,
    rows: number,
  ): MosaicTile | undefined {
    const { columns, horizontal, vertical } =
      MOSAIC_SUB_FAMILY_SHAPES[subFamily];
    const levels = rows - 1;

    if (
      levels < 1 ||
      !this.closes(horizontal, levels) ||
      !this.closes(vertical, levels)
    ) {
      return undefined;
    }

    return this.mosaicTileService.build(
      { columns, rows },
      {
        horizontal: this.grid(horizontal, levels, columns),
        vertical: this.grid(vertical, levels - 1, columns),
      },
    );
  }
}
