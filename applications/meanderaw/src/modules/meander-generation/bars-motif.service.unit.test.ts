import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BarsMotifService } from "./bars-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";

describe(BarsMotifService, () => {
  let service: BarsMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BarsMotifService,
        GridGeometryService,
        MotifTransformsService,
      ],
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

    it("draws period 1's zigzag, matching the real edges decoded from 5 rows bars alternated.svg", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          modifier: { name: "alternated", period: 1 },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe("M3 15V27M15 27V39M3 39V51M3 3H27M3 63H27");
    });

    it("advances two real columns per unit index for the alternated modifier", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          modifier: { name: "alternated", period: 1 },
          rows: 5,
          unitIndex: 1,
        }),
      ).toBe("M27 15V27M39 27V39M27 39V51M27 3H51M27 63H51");
    });

    it("draws period 1's zigzag, matching the real edges decoded from 8 rows bars alternated.svg", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.path(geometry, {
          modifier: { name: "alternated", period: 1 },
          rows: 8,
          unitIndex: 0,
        }),
      ).toBe(
        "M1.875 9.375V16.875M9.375 16.875V24.375M1.875 24.375V31.875M9.375 31.875V39.375M1.875 39.375V46.875M9.375 46.875V54.375M1.875 1.875H16.875M1.875 61.875H16.875",
      );
    });

    it("widens the tile to 2 * period columns at period 2, filling each half with a period-1-style zigzag pair", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          modifier: { name: "alternated", period: 2 },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe(
        "M3 15V27M27 27V39M3 39V51M15 15V27M39 27V39M15 39V51M3 3H51M3 63H51",
      );
    });

    it("advances the tile by 2 * period columns per unit index at period 2", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          modifier: { name: "alternated", period: 2 },
          rows: 5,
          unitIndex: 1,
        }),
      ).toBe(
        "M51 15V27M75 27V39M51 39V51M63 15V27M87 27V39M63 39V51M51 3H99M51 63H99",
      );
    });

    it("draws alternating dash/gap segments for the split modifier, matching 5 rows bars split.svg", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          modifier: { name: "split" },
          rows: 5,
          unitIndex: 0,
        }),
      ).toBe("M3 15V27M3 39V51M3 3H15M3 63H15");
    });

    it("shifts the split modifier's column by one grid unit per unit index", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, {
          modifier: { name: "split" },
          rows: 5,
          unitIndex: 1,
        }),
      ).toBe("M15 15V27M15 39V51M15 3H27M15 63H27");
    });

    it("draws one extra dash/gap pair for the split modifier, matching 7 rows bars split.svg", () => {
      const geometry = gridGeometryService.compute(7);

      expect(
        service.path(geometry, {
          modifier: { name: "split" },
          rows: 7,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.14286 10.71429V19.28571M2.14286 27.85714V36.42857M2.14286 45V53.57143M2.14286 2.14286H10.71429M2.14286 62.14286H10.71429",
      );
    });

    it("draws a single dash and no gap for the split modifier at the structural minimum of 3 rows", () => {
      const geometry = gridGeometryService.compute(3);

      expect(
        service.path(geometry, {
          modifier: { name: "split" },
          rows: 3,
          unitIndex: 0,
        }),
      ).toBe("M5 25V45M5 5H25M5 65H25");
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

    it("doubles the touched columns for the alternated modifier at period 1, matching 5 rows bars alternated.svg", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "alternated", period: 1 },
          repeatCount: 6,
          rows: 5,
        }),
      ).toBe(135);
    });

    it("widens the touched columns to 2 * period * repeatCount - 1 at period 2", () => {
      const geometry = gridGeometryService.compute(8);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "alternated", period: 2 },
          repeatCount: 6,
          rows: 8,
        }),
      ).toBe(174.375);
    });

    it.each`
      period | expectedColumns
      ${1}   | ${2}
      ${2}   | ${4}
      ${3}   | ${6}
    `(
      "spans 2 * period ($expectedColumns) real columns per repeat, matching 7 rows bars alternated / alternated 2 / alternated 3 at period $period",
      ({
        expectedColumns,
        period,
      }: {
        expectedColumns: number;
        period: number;
      }) => {
        const geometry = gridGeometryService.compute(7);
        const singleUnitRightEdge = service.rightEdge(geometry, {
          modifier: { name: "alternated", period },
          repeatCount: 1,
          rows: 7,
        });

        expect(singleUnitRightEdge).toBeCloseTo(
          geometry.offset + (expectedColumns - 1) * geometry.unit,
        );
      },
    );
  });
});
