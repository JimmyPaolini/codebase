import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

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

  describe("enumerate", () => {
    /**
     * The one number that pins the model down.
     *
     * `README.md`'s negative-space survey reports that the sweep's folded
     * 2,013 tiles at 8 rows and 2 columns come from 11,275 unfolded, and it
     * arrived at both by walking covers of cells. Recovering the same pair
     * by counting *edge subsets under a ceiling of one incident edge per
     * point* is what says the two descriptions are the same space and not
     * merely similar-sized ones — so a representation that got the lattice
     * wrong fails here rather than somewhere subtler.
     */
    it("finds the 2,013 folded tiles at 8 rows and 2 columns that the survey's 11,275 unfolded ones reduce to", () => {
      const tiles = service.enumerate(8, 2);
      const unfolded = tiles.reduce(
        (total, tile) => total + mosaicSymmetryService.variants(tile).length,
        0,
      );

      expect(tiles).toHaveLength(2013);
      expect(unfolded).toBe(11275);
    });

    it("touches every point of every tile it returns with at most one edge", () => {
      for (const rows of [4, 5, 6, 7]) {
        for (const columns of [1, 2]) {
          for (const tile of service.enumerate(rows, columns)) {
            for (const [level, row] of tile.points.entries()) {
              for (const [column] of row.entries()) {
                expect(
                  mosaicTileService.incidentEdges(tile, level, column),
                ).toBeLessThanOrEqual(service.ceiling());
              }
            }
          }
        }
      }
    });

    it("returns one tile per symmetry class, never two that draw the same pattern", () => {
      const tiles = service.enumerate(6, 2);
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
        .enumerate(6, 2)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));

      // `dots` is a bare point on every level, so `0` throughout;
      // `lines` is the single column's wrapped rule on every level, so `3`
      // — east and west — throughout; `dashes` alternates the anchor `2`
      // with the point `1` it reaches across a two-column tile.
      expect(singleColumn).toContain("00000");
      expect(singleColumn).toContain("33333");
      expect(twoColumn).toContain("2121212121");
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

    it.each`
      rows | columns | expected
      ${4} | ${1}    | ${8}
      ${4} | ${2}    | ${15}
      ${5} | ${1}    | ${18}
      ${6} | ${1}    | ${40}
      ${6} | ${2}    | ${159}
    `(
      "enumerates $expected distinct tiles at $rows rows and $columns columns",
      ({
        columns,
        expected,
        rows,
      }: {
        columns: number;
        expected: number;
        rows: number;
      }) => {
        expect(service.enumerate(rows, columns)).toHaveLength(expected);
      },
    );

    it("returns tiles whose direction bits agree, so every one of them denotes a drawing", () => {
      const tiles = service.enumerate(7, 2);
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
