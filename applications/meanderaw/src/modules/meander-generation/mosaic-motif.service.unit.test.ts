import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "./grid-geometry.service";
import { MosaicMotifService } from "./mosaic-motif.service";

import type { MosaicTile } from "./meander-generation.types";

describe(MosaicMotifService, () => {
  let service: MosaicMotifService;
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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [GridGeometryService, MosaicMotifService],
    }).compile();

    service = await module.resolve(MosaicMotifService);
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

      expect(service.path(geometry, tile, 0)).toBe(
        "M2.5 12.5H2.5M2.5 22.5V32.5M2.5 42.5H12.5M2.5 2.5H12.5M2.5 62.5H12.5",
      );
    });

    it("advances a whole tile's column span per repeat unit", () => {
      const geometry = gridGeometryService.compute(wrapping.rows);

      expect(service.path(geometry, wrapping, 2)).toContain("M105 45H125");
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
});
