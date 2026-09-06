import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mosaicTile } from "../../../testing/mosaic-tiles";
import { rightmostX } from "../../../testing/path-data";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import { MosaicTileMotifService } from "./mosaic-tile-motif.service";
import { MosaicTileService } from "./mosaic-tile.service";

import type { MosaicTile } from "./mosaic-motif.types";

// 🧪 Tests

describe(MosaicTileMotifService, () => {
  let service: MosaicTileMotifService;
  let gridGeometryService: GridGeometryService;

  // Two columns over two interior levels: bare points across the top level,
  // and an eastward edge on the lower one anchored at the last column, so it
  // reaches into the next repeat unit.
  const wrapping = mosaicTile(["..", ".e"]);

  // One column of bare points, which reaches no further right than its own
  // column, and the same column whose first point carries the wrapped
  // east-west rule, which spans a full grid unit into the next repeat unit.
  const singleDot = mosaicTile([".", ".", ".", ".", "."]);
  const singleLine = mosaicTile(["e", ".", ".", ".", "."]);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GridGeometryService,
        MosaicTileMotifService,
        MosaicTileService,
      ],
    }).compile();

    service = await module.resolve(MosaicTileMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("path", () => {
    it("draws a bare point as a zero-length mark and each owned edge as a one-unit segment", () => {
      const geometry = gridGeometryService.compute(6);
      const tile = mosaicTile([".", "s", ".", "e", "."]);

      expect(
        service.path(geometry, tile, { isLastUnit: false, unitIndex: 0 }),
      ).toBe(
        "M2.5 12.5H2.5M2.5 22.5V32.5M2.5 42.5H12.5M2.5 52.5H2.5M2.5 2.5H12.5M2.5 62.5H12.5",
      );
    });

    it("draws nothing at a point whose only ink is an edge its neighbor owns", () => {
      const geometry = gridGeometryService.compute(4);

      // The middle point is reached from above and owns nothing, so the
      // point below it is the next thing drawn.
      expect(
        service.path(geometry, mosaicTile(["s", ".", "."]), {
          isLastUnit: false,
          unitIndex: 0,
        }),
      ).toContain("M3.75 18.75V33.75M3.75 48.75H3.75M");
    });

    it("draws both of a point's own edges where it owns both, with no case of its own", () => {
      const geometry = gridGeometryService.compute(4);

      expect(
        service.path(geometry, mosaicTile(["b.", "..", ".."]), {
          isLastUnit: false,
          unitIndex: 0,
        }),
      ).toContain("M3.75 18.75H18.75M3.75 18.75V33.75");
    });

    it("advances a whole tile's column span per repeat unit", () => {
      const geometry = gridGeometryService.compute(wrapping.rows);

      expect(
        service.path(geometry, wrapping, { isLastUnit: false, unitIndex: 2 }),
      ).toContain("M105 45H125");
    });
  });

  describe("leadingOverhang", () => {
    it("draws the edge that reaches in from the repeat unit before the first", () => {
      const geometry = gridGeometryService.compute(wrapping.rows);

      expect(service.leadingOverhang(geometry, wrapping)).toBe("M-15 45H5");
    });

    it("draws nothing for a tile whose edges all stay inside it", () => {
      const geometry = gridGeometryService.compute(wrapping.rows);

      expect(service.leadingOverhang(geometry, mosaicTile(["e.", ".."]))).toBe(
        "",
      );
    });

    it("draws nothing at a single column, where the wrapped edge's own point is already the first one", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.leadingOverhang(geometry, singleLine)).toBe("");
    });
  });

  describe("rightEdge", () => {
    it("stops at the last column for a tile whose points own no eastward edge", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.rightEdge(geometry, singleDot, 6)).toBe(52.5);
    });

    it("reaches a unit further for a tile whose last column carries an eastward edge", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.rightEdge(geometry, singleLine, 6)).toBe(62.5);
    });
  });

  describe.each<[string, MosaicTile]>([
    ["bare points", singleDot],
    ["a right-spanning wrapped rule", singleLine],
    ["an edge reaching into the next unit", wrapping],
  ])("last unit of %s", (_label, tile) => {
    it("ends its cap ticks flush with the rightmost ink it draws", () => {
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
