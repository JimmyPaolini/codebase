import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mosaicTile } from "../../../testing/mosaic-tiles";

import { MalformedMosaicTileError } from "./mosaic-motif.constants";
import { MosaicTileService } from "./mosaic-tile.service";

import type { MosaicDirections, MosaicTile } from "./mosaic-motif.types";

// 🔧 Configuration

/** All four bits clear, to be spread over with whichever ones a case is about. */
const BARE: MosaicDirections = {
  east: false,
  north: false,
  south: false,
  west: false,
};

// 🧪 Tests

describe(MosaicTileService, () => {
  let service: MosaicTileService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MosaicTileService],
    }).compile();

    service = await module.resolve(MosaicTileService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("build", () => {
    it("gives the point an edge reaches the matching bit, so a pair of neighbors agree", () => {
      const tile = mosaicTile(["e.", "..", ".."]);

      expect(tile.points[0]?.[0]).toStrictEqual({ ...BARE, east: true });
      expect(tile.points[0]?.[1]).toStrictEqual({ ...BARE, west: true });
    });

    it("gives the point below a southward edge its north bit", () => {
      const tile = mosaicTile(["s", ".", "."]);

      expect(tile.points[0]?.[0]).toStrictEqual({ ...BARE, south: true });
      expect(tile.points[1]?.[0]).toStrictEqual({ ...BARE, north: true });
    });

    it("wraps an eastward edge on the last column into the first, which is what makes a tile tile", () => {
      const tile = mosaicTile([".e", ".."]);

      expect(tile.points[0]?.[1]?.east).toBe(true);
      expect(tile.points[0]?.[0]?.west).toBe(true);
    });

    it("sets east and west together at one column, where the edge wraps onto its own point", () => {
      const tile = mosaicTile(["e", "."]);

      expect(tile.points[0]?.[0]).toStrictEqual({
        ...BARE,
        east: true,
        west: true,
      });
    });

    it("leaves the first level carrying no north and the last carrying no south, since the cap ticks are not tile points", () => {
      const tile = mosaicTile(["s", "s", "s"]);

      expect(tile.points[0]?.[0]?.north).toBe(false);
      expect(tile.points[2]?.[0]?.south).toBe(false);
    });

    it("gives a tile one level fewer than its rows", () => {
      expect(mosaicTile([".", ".", ".", "."])).toMatchObject({
        columns: 1,
        rows: 5,
      });
    });
  });

  describe("edges", () => {
    it("holds each edge once, at the point that owns it", () => {
      expect(service.edges(mosaicTile(["e.", ".s", ".."]))).toStrictEqual({
        horizontal: [
          [true, false],
          [false, false],
          [false, false],
        ],
        vertical: [
          [false, false],
          [false, true],
        ],
      });
    });

    it("round-trips a tile through its own edges unchanged", () => {
      const tile = mosaicTile(["b.", ".s", "e."]);

      expect(
        service.build({ columns: 2, rows: 4 }, service.edges(tile)),
      ).toStrictEqual(tile);
    });
  });

  describe("degree", () => {
    it("counts a bare point as nothing and a dash end as one", () => {
      expect(service.degree(BARE)).toBe(0);
      expect(service.degree({ ...BARE, east: true })).toBe(1);
    });

    it("counts a corner, a T-junction, and a crossing as two, three, and four", () => {
      expect(service.degree({ ...BARE, east: true, south: true })).toBe(2);
      expect(
        service.degree({ ...BARE, east: true, south: true, west: true }),
      ).toBe(3);
      expect(
        service.degree({ east: true, north: true, south: true, west: true }),
      ).toBe(4);
    });

    it("counts a single column's wrapped edge twice, because the ink really does leave both ways", () => {
      const tile = mosaicTile(["e", "."]);
      const point = tile.points[0]?.[0];

      expect(point && service.degree(point)).toBe(2);
    });
  });

  describe("incidentEdges", () => {
    it("counts a single column's wrapped edge once, because it is one edge", () => {
      expect(service.incidentEdges(mosaicTile(["e", "."]), 0, 0)).toBe(1);
    });

    it("agrees with the degree wherever an edge joins two different points", () => {
      const tile = mosaicTile(["e.", "s.", ".."]);

      expect(service.incidentEdges(tile, 0, 0)).toBe(1);
      expect(service.incidentEdges(tile, 1, 0)).toBe(1);
      expect(service.incidentEdges(tile, 2, 0)).toBe(1);
    });

    it("counts nothing at a point outside the tile", () => {
      expect(service.incidentEdges(mosaicTile(["."]), 4, 4)).toBe(0);
    });
  });

  describe("isBare", () => {
    it("is true of a point on no edge and false of one on any", () => {
      expect(service.isBare(BARE)).toBe(true);
      expect(service.isBare({ ...BARE, north: true })).toBe(false);
    });
  });

  describe("blankEdges and mark", () => {
    it("starts every edge unset, one grid per direction", () => {
      expect(service.blankEdges({ columns: 2, rows: 4 })).toStrictEqual({
        horizontal: [
          [false, false],
          [false, false],
          [false, false],
        ],
        vertical: [
          [false, false],
          [false, false],
        ],
      });
    });

    it("ignores a level the grid does not have, so a caller may walk past the last one", () => {
      const edges = service.blankEdges({ columns: 1, rows: 3 });

      expect(() => service.mark(edges.vertical, 5, 0)).not.toThrow();
      expect(edges.vertical).toStrictEqual([[false]]);
    });
  });

  describe("assertWellFormed", () => {
    it("accepts a tile its own builder produced", () => {
      expect(() =>
        service.assertWellFormed(mosaicTile(["e.", ".s", ".."])),
      ).not.toThrow();
    });

    it("refuses a grid with the wrong number of levels for its rows", () => {
      const tile: MosaicTile = { columns: 1, points: [[BARE]], rows: 6 };

      expect(() => service.assertWellFormed(tile)).toThrow(
        MalformedMosaicTileError,
      );
    });

    it("refuses a level that does not span the tile's own columns", () => {
      const tile: MosaicTile = { columns: 2, points: [[BARE]], rows: 2 };

      expect(() => service.assertWellFormed(tile)).toThrow(
        MalformedMosaicTileError,
      );
    });

    it("refuses two points that disagree about the edge between them", () => {
      const tile: MosaicTile = {
        columns: 2,
        points: [[{ ...BARE, east: true }, BARE]],
        rows: 2,
      };

      expect(() => service.assertWellFormed(tile)).toThrow(
        /east at level 0 column 0/u,
      );
    });

    it("refuses a southward bit the point below does not answer with a north", () => {
      const tile: MosaicTile = {
        columns: 1,
        points: [[{ ...BARE, south: true }], [BARE]],
        rows: 3,
      };

      expect(() => service.assertWellFormed(tile)).toThrow(
        /south at level 0 column 0/u,
      );
    });

    it("refuses a north on the first level, where grid level 0 is a cap tick", () => {
      const tile: MosaicTile = {
        columns: 1,
        points: [[{ ...BARE, north: true }]],
        rows: 2,
      };

      expect(() => service.assertWellFormed(tile)).toThrow(
        /the first level carries no north/u,
      );
    });
  });
});
