import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { OversizedMosaicTileError } from "./mosaic-motif.constants";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

// 🔧 Configuration

/**
 * Every shape the edge budget admits, with the tile counts each holds: how
 * many the family enumerates now, and how many of those the original
 * exact-cover rule would have found.
 *
 * Written out rather than derived, because these numbers are the thing being
 * asserted. A change to the enumeration rule that resized the space would
 * pass a derived table and fails this one.
 */
const ADMITTED_SHAPES: readonly {
  readonly columns: number;
  readonly matchings: number;
  readonly rows: number;
  readonly tiles: number;
}[] = [
  { columns: 1, matchings: 4, rows: 3, tiles: 4 },
  { columns: 2, matchings: 6, rows: 3, tiles: 15 },
  { columns: 3, matchings: 9, rows: 3, tiles: 41 },
  { columns: 4, matchings: 20, rows: 3, tiles: 164 },
  { columns: 5, matchings: 36, rows: 3, tiles: 665 },
  { columns: 1, matchings: 8, rows: 4, tiles: 9 },
  { columns: 2, matchings: 15, rows: 4, tiles: 85 },
  { columns: 3, matchings: 33, rows: 4, tiles: 711 },
  { columns: 1, matchings: 18, rows: 5, tiles: 21 },
  { columns: 2, matchings: 50, rows: 5, tiles: 640 },
  { columns: 1, matchings: 40, rows: 6, tiles: 51 },
];

// 🧪 Tests

describe(MosaicTilesService, () => {
  let service: MosaicTilesService;
  let mosaicSymmetryService: MosaicSymmetryService;
  let mosaicTileService: MosaicTileService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MosaicSymmetryService, MosaicTileService, MosaicTilesService],
    }).compile();

    service = await module.resolve(MosaicTilesService);
    mosaicSymmetryService = await module.resolve(MosaicSymmetryService);
    mosaicTileService = await module.resolve(MosaicTileService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the edge budget", () => {
    it("admits exactly eleven shapes, none of them above six rows", () => {
      expect(
        ADMITTED_SHAPES.map(({ columns, rows }) => `${rows}x${columns}`),
      ).toStrictEqual([
        "3x1",
        "3x2",
        "3x3",
        "3x4",
        "3x5",
        "4x1",
        "4x2",
        "4x3",
        "5x1",
        "5x2",
        "6x1",
      ]);
    });

    it("gives a shallower band more columns, since a tile's edge count grows in both dimensions at once", () => {
      expect(service.maximumColumns(3)).toBe(5);
      expect(service.maximumColumns(4)).toBe(3);
      expect(service.maximumColumns(5)).toBe(2);
      expect(service.maximumColumns(6)).toBe(1);
    });

    it("counts a shape's edges as columns times two rows less three", () => {
      expect(service.edges({ columns: 2, rows: 5 })).toBe(14);
      expect(service.edges({ columns: 5, rows: 3 })).toBe(15);
    });

    /**
     * The shape the negative-space survey measured, which the budget no
     * longer admits.
     *
     * `README.md` reports 2,013 folded tiles at 8 rows and 2 columns from
     * 11,275 unfolded — under the old exact-cover rule. Without a degree
     * ceiling that same shape holds 2 ** 26 assignments, which is what the
     * budget exists to refuse: the shapes the matching rule made cheap are
     * exactly the ones an unbounded degree makes ruinous.
     */
    it("refuses a shape past the budget rather than enumerating it slowly", () => {
      expect(service.isAdmitted({ columns: 2, rows: 8 })).toBe(false);
      expect(() => service.enumerate(8, 2)).toThrow(OversizedMosaicTileError);
    });
  });

  describe("enumerate", () => {
    it.each(ADMITTED_SHAPES)(
      "carries no more than two direction bits at any point of any tile at $rows rows and $columns columns",
      ({ columns, rows }) => {
        const degrees = service
          .enumerate(rows, columns)
          .flatMap((tile) =>
            tile.points.flatMap((row) =>
              row.map((point) => mosaicTileService.degree(point)),
            ),
          );

        expect(Math.max(...degrees)).toBeLessThanOrEqual(service.ceiling());
      },
    );

    it("returns one tile per symmetry class, never two that draw the same pattern", () => {
      const tiles = service.enumerate(4, 2);
      const identifiers = tiles.map((tile) =>
        mosaicSymmetryService.canonicalIdentifier(tile),
      );

      expect(new Set(identifiers).size).toBe(tiles.length);
    });

    it("orders tiles by canonical identifier, so a sweep is stable across runs", () => {
      const identifiers = service
        .enumerate(5, 1)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));

      expect(identifiers).toStrictEqual(identifiers.toSorted());
    });

    it("returns the representative of each class rather than whichever member the walk reached first", () => {
      for (const tile of service.enumerate(5, 2)) {
        expect(mosaicSymmetryService.canonicalTile(tile)).toStrictEqual(tile);
      }
    });

    it("includes the three named members of the family at 6 rows", () => {
      const singleColumn = service
        .enumerate(6, 1)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));
      const twoColumn = service
        .enumerate(5, 2)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));

      // `dots` is a bare point on every level, so `0` throughout;
      // `lines` is the single column's wrapped rule on every level, so `3`
      // — east and west — throughout; `dashes` alternates the anchor `2`
      // with the point `1` it reaches across a two-column tile.
      expect(singleColumn).toContain("00000");
      expect(singleColumn).toContain("33333");
      expect(twoColumn).toContain("21212121");
    });

    it("finds only the dot and the line at the smallest tile there is", () => {
      const identifiers = service
        .enumerate(4, 1)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));

      // Three interior levels, one column. Every point bare, every point on
      // the wrapped rule, and a southward edge over the lower two levels —
      // the last being the representative its own top-to-bottom mirror
      // folds onto.
      expect(identifiers).toContain("000");
      expect(identifiers).toContain("333");
      expect(identifiers).toContain("048");
    });

    it.each(ADMITTED_SHAPES)(
      "enumerates $tiles distinct tiles at $rows rows and $columns columns",
      ({ columns, rows, tiles }) => {
        expect(service.enumerate(rows, columns)).toHaveLength(tiles);
      },
    );

    it("enumerates 2,406 tiles across the whole space the budget admits", () => {
      const total = ADMITTED_SHAPES.reduce(
        (running, { columns, rows }) =>
          running + service.enumerate(rows, columns).length,
        0,
      );

      expect(total).toBe(2406);
    });

    /**
     * The claim that makes this a widening rather than a replacement.
     *
     * The family's original rule was one incident edge per point — an exact
     * cover of its cells. That is a region strictly inside a ceiling of two
     * direction bits, so filtering the wider enumeration down to it has to
     * return exactly the set the narrower rule returned, shape for shape.
     * The five shapes the old sweep committed are the last five rows here,
     * and 8 / 15 / 18 / 50 / 40 are the file counts those directories held.
     */
    it.each(ADMITTED_SHAPES)(
      "still finds the $matchings tiles the old exact-cover rule found at $rows rows and $columns columns",
      ({ columns, matchings, rows }) => {
        const covers = service
          .enumerate(rows, columns)
          .filter((tile) => service.isMatching(tile));

        expect(covers).toHaveLength(matchings);
      },
    );

    it("returns tiles whose direction bits agree, so every one of them denotes a drawing", () => {
      const tiles = service.enumerate(4, 3);
      const malformed = tiles.filter((tile) => {
        try {
          mosaicTileService.assertWellFormed(tile);

          return tile.points.length !== tile.rows - 1;
        } catch {
          return true;
        }
      });

      expect(tiles.length).toBeGreaterThan(0);
      expect(malformed).toStrictEqual([]);
    });
  });
});
