import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "./boxes-motif.service";
import { GridGeometryService } from "./grid-geometry.service";

describe(BoxesMotifService, () => {
  let service: BoxesMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BoxesMotifService, GridGeometryService],
    }).compile();

    service = await module.resolve(BoxesMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("unitWidth", () => {
    it("spans rows minus one grid units, matching the spiral's depth", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.unitWidth(geometry, 5)).toBe(48);
    });
  });

  describe("path", () => {
    it("draws the first unit's spiral, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.path(geometry, 5, 0)).toBe("M3 15H39V51H3V27H27V39H15");
    });

    it("shifts each subsequent unit by rows minus one grid units", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.path(geometry, 5, 1)).toBe("M51 15H87V51H51V27H75V39H63");
    });

    it("draws a deeper spiral at 6 rows, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.path(geometry, 6, 0)).toBe(
        "M2.5 12.5H42.5V52.5H2.5V22.5H32.5V42.5H12.5V32.5H22.5",
      );
    });

    it("draws a plain rectangle at the structural minimum of 3 rows", () => {
      const geometry = gridGeometryService.compute(3);

      expect(service.path(geometry, 3, 0)).toBe("M5 25H25V45H5");
    });
  });

  describe("border", () => {
    it("spans from the left edge to the last unit's rightmost point", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.border(geometry, 5, 6)).toBe("M279 63H3M279 3H3");
    });
  });
});
