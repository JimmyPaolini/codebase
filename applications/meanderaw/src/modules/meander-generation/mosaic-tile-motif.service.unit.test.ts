import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "./grid-geometry.service";
import { MosaicTileMotifService } from "./mosaic-tile-motif.service";

import type { MosaicTile } from "./meander-generation.types";

// 🔧 Configuration

/** The rightmost x-coordinate a stretch of path data draws. */
const rightmostX = (pathData: string): number =>
  Math.max(
    ...[...pathData.matchAll(/[MH]([\d.]+)/g)].map((match) => Number(match[1])),
  );

// 🧪 Tests

describe(MosaicTileMotifService, () => {
  let service: MosaicTileMotifService;
  let gridGeometryService: GridGeometryService;

  // Two columns over two interior levels: dots across the top level, and a
  // dash on the lower one anchored at the last column, so it wraps into the
  // next repeat unit.
  const wrapping: MosaicTile = {
    columns: 2,
    pieces: [
      { column: 0, kind: "dot", level: 0 },
      { column: 1, kind: "dot", level: 0 },
      { column: 1, kind: "horizontal", level: 1 },
    ],
    rows: 3,
  };

  // One column carrying a single dot, which reaches no further right than
  // its own column, and the same column carrying a `line` instead, which
  // spans a full grid unit into the next repeat unit.
  const singleDot: MosaicTile = {
    columns: 1,
    pieces: [{ column: 0, kind: "dot", level: 0 }],
    rows: 6,
  };
  const singleLine: MosaicTile = {
    ...singleDot,
    pieces: [{ column: 0, kind: "line", level: 0 }],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GridGeometryService, MosaicTileMotifService],
    }).compile();

    service = await module.resolve(MosaicTileMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("path", () => {
    it("draws a dot as a zero-length mark and a dash as a one-unit segment", () => {
      const geometry = gridGeometryService.compute(6);
      const tile: MosaicTile = {
        columns: 1,
        pieces: [
          { column: 0, kind: "dot", level: 0 },
          { column: 0, kind: "vertical", level: 1 },
          { column: 0, kind: "line", level: 3 },
        ],
        rows: 6,
      };

      expect(
        service.path(geometry, tile, { isLastUnit: false, unitIndex: 0 }),
      ).toBe(
        "M2.5 12.5H2.5M2.5 22.5V32.5M2.5 42.5H12.5M2.5 2.5H12.5M2.5 62.5H12.5",
      );
    });

    it("advances a whole tile's column span per repeat unit", () => {
      const geometry = gridGeometryService.compute(wrapping.rows);

      expect(
        service.path(geometry, wrapping, { isLastUnit: false, unitIndex: 2 }),
      ).toContain("M105 45H125");
    });
  });

  describe("leadingOverhang", () => {
    it("draws the dash that reaches in from the repeat unit before the first", () => {
      const geometry = gridGeometryService.compute(wrapping.rows);

      expect(service.leadingOverhang(geometry, wrapping)).toBe("M-15 45H5");
    });

    it("draws nothing for a tile whose dashes all stay inside it", () => {
      const geometry = gridGeometryService.compute(wrapping.rows);
      const contained: MosaicTile = {
        ...wrapping,
        pieces: [{ column: 0, kind: "horizontal", level: 0 }],
      };

      expect(service.leadingOverhang(geometry, contained)).toBe("");
    });
  });

  describe("rightEdge", () => {
    it("stops at the last column for a tile that ends in dots", () => {
      const geometry = gridGeometryService.compute(6);
      const dots: MosaicTile = {
        columns: 1,
        pieces: [{ column: 0, kind: "dot", level: 0 }],
        rows: 6,
      };

      expect(service.rightEdge(geometry, dots, 6)).toBe(52.5);
    });

    it("reaches a unit further for a tile whose last column's mark spans right", () => {
      const geometry = gridGeometryService.compute(6);
      const lines: MosaicTile = {
        columns: 1,
        pieces: [{ column: 0, kind: "line", level: 0 }],
        rows: 6,
      };

      expect(service.rightEdge(geometry, lines, 6)).toBe(62.5);
    });
  });

  describe.each<[string, MosaicTile]>([
    ["dots", singleDot],
    ["a right-spanning line", singleLine],
    ["a dash wrapping into the next unit", wrapping],
  ])("last unit of %s", (_label, tile) => {
    it("ends its cap ticks flush with the rightmost mark it draws", () => {
      const geometry = gridGeometryService.compute(tile.rows);
      const unitIndex = 5;
      const pathData = service.path(geometry, tile, {
        isLastUnit: true,
        unitIndex,
      });

      expect(rightmostX(pathData)).toBe(
        service.rightEdge(geometry, tile, unitIndex + 1),
      );
    });

    it("keeps an interior unit's cap ticks reaching into the next tile", () => {
      const geometry = gridGeometryService.compute(tile.rows);
      const unitIndex = 5;
      const pathData = service.path(geometry, tile, {
        isLastUnit: false,
        unitIndex,
      });

      expect(rightmostX(pathData)).toBe(
        geometry.offset + (unitIndex + 1) * tile.columns * geometry.unit,
      );
    });
  });
});
