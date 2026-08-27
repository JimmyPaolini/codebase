// cspell:ignore hxhxhxhxhx — the `dashes` tile's identifier, one letter
// per cell of the tile, from MOSAIC_MARK_LETTERS.
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type { MosaicTile } from "./mosaic-motif.types";

describe(MosaicTilesService, () => {
  let service: MosaicTilesService;
  let mosaicSymmetryService: MosaicSymmetryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MosaicTilesService, MosaicSymmetryService],
    }).compile();

    service = await module.resolve(MosaicTilesService);
    mosaicSymmetryService = await module.resolve(MosaicSymmetryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("enumerate", () => {
    it("covers every cell exactly once in every tile it returns", () => {
      for (const rows of [4, 5, 6, 7]) {
        for (const columns of [1, 2]) {
          for (const tile of service.enumerate(rows, columns)) {
            const claims = new Map<number, number>();

            for (const piece of tile.pieces) {
              for (const cell of mosaicSymmetryService.coveredCells(
                piece,
                columns,
              )) {
                claims.set(cell, (claims.get(cell) ?? 0) + 1);
              }
            }

            const cellCount = columns * (rows - 1);

            expect(claims.size).toBe(cellCount);
            expect([...claims.values()].every((claim) => claim === 1)).toBe(
              true,
            );
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

    it("includes the three named members of the family at 6 rows", () => {
      const singleColumn = service
        .enumerate(6, 1)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));
      const twoColumn = service
        .enumerate(6, 2)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));

      // `dots` is a dot on every level; `lines` is the single-column tile's
      // continuous rule on every level; `dashes` is a horizontal dash across
      // both columns of a two-column tile.
      expect(singleColumn).toContain("ddddd");
      expect(singleColumn).toContain("lllll");
      expect(twoColumn).toContain("hxhxhxhxhx");
    });

    it("finds only the dot and the line at the smallest tile there is", () => {
      const identifiers = service
        .enumerate(4, 1)
        .map((tile) => mosaicSymmetryService.canonicalIdentifier(tile));

      // Three interior levels, one column: everything is a dot, a line, or
      // a vertical dash over two of the levels. The dash tile is named
      // `dvx` rather than `vxd` because a tile and its top-to-bottom mirror
      // share the smaller of the two names.
      expect(identifiers).toContain("ddd");
      expect(identifiers).toContain("lll");
      expect(identifiers).toContain("dvx");
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

    it("never anchors a piece outside the tile it belongs to", () => {
      const tiles: MosaicTile[] = service.enumerate(7, 2);

      for (const tile of tiles) {
        for (const piece of tile.pieces) {
          expect(piece.column).toBeGreaterThanOrEqual(0);
          expect(piece.column).toBeLessThan(tile.columns);
          expect(piece.level).toBeGreaterThanOrEqual(0);
          expect(piece.level).toBeLessThan(tile.rows - 1);
        }
      }
    });
  });
});
