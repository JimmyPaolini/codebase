import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BarsMotifService } from "./bars-motif.service";
import { GridGeometryService } from "./grid-geometry.service";

describe(BarsMotifService, () => {
  let service: BarsMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BarsMotifService, GridGeometryService],
    }).compile();

    service = await module.resolve(BarsMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("path", () => {
    it("draws the first unit's bar, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.path(geometry, { rows: 5, unitIndex: 0 })).toBe(
        "M3 15V51M3 3H15M3 63H15",
      );
    });

    it("shifts each subsequent unit by one grid unit, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.path(geometry, { rows: 5, unitIndex: 1 })).toBe(
        "M15 15V51M15 3H27M15 63H27",
      );

      expect(service.path(geometry, { rows: 5, unitIndex: 11 })).toBe(
        "M135 15V51M135 3H147M135 63H147",
      );
    });

    it("draws a shallower bar at 6 rows, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.path(geometry, { rows: 6, unitIndex: 0 })).toBe(
        "M2.5 12.5V52.5M2.5 2.5H12.5M2.5 62.5H12.5",
      );
    });

    it("draws a deeper bar at 8 rows, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(8);

      expect(service.path(geometry, { rows: 8, unitIndex: 0 })).toBe(
        "M1.875 9.375V54.375M1.875 1.875H9.375M1.875 61.875H9.375",
      );
    });

    it("draws a plain rectangle-free bar at the structural minimum of 3 rows", () => {
      const geometry = gridGeometryService.compute(3);

      expect(service.path(geometry, { rows: 3, unitIndex: 0 })).toBe(
        "M5 25V45M5 5H25M5 65H25",
      );
    });
  });

  describe("rightEdge", () => {
    it("stops at the last unit's own column, matching the declared canvas width in 5 rows bars.svg", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.rightEdge(geometry, { repeatCount: 12, rows: 5 })).toBe(
        135,
      );
    });

    it("stops at the last unit's own column, matching the declared canvas width in 6 rows bars.svg", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.rightEdge(geometry, { repeatCount: 12, rows: 6 })).toBe(
        112.5,
      );
    });

    it("stops at the last unit's own column, matching the declared canvas width in 8 rows bars.svg", () => {
      const geometry = gridGeometryService.compute(8);

      expect(service.rightEdge(geometry, { repeatCount: 12, rows: 8 })).toBe(
        84.375,
      );
    });
  });
});
