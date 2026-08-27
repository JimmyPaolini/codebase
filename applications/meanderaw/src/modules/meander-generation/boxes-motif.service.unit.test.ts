import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { BoxesMotifService } from "./boxes-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";

// 🔧 Configuration

/** The rightmost x-coordinate a stretch of path data draws. */
const rightmostX = (pathData: string): number =>
  Math.max(
    ...[...pathData.matchAll(/[MH]([\d.]+)/g)].map((match) => Number(match[1])),
  );

// 🧪 Tests

describe(BoxesMotifService, () => {
  let service: BoxesMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoxesMotifService,
        GridGeometryService,
        MotifTransformsService,
      ],
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

      expect(
        service.path(geometry, { isLastUnit: false, rows: 5, unitIndex: 0 }),
      ).toBe("M3 15H39V51H3V27H27V39H15");
    });

    it("shifts each subsequent unit by rows minus one grid units", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 5, unitIndex: 1 }),
      ).toBe("M51 15H87V51H51V27H75V39H63");
    });

    it("draws a deeper spiral at 6 rows, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 6, unitIndex: 0 }),
      ).toBe("M2.5 12.5H42.5V52.5H2.5V22.5H32.5V42.5H12.5V32.5H22.5");
    });

    it("draws a plain rectangle at the structural minimum of 3 rows", () => {
      const geometry = gridGeometryService.compute(3);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 3, unitIndex: 0 }),
      ).toBe("M5 25H25V45H5");
    });

    describe("with the spin modifier", () => {
      const modifier = { name: "spin" } as const;

      it("leaves unit 0 unchanged, matching the spin reference", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 0,
          }),
        ).toBe("M3 15H39V51H3V27H27V39H15");
      });

      it("rotates unit 1 by 90°, matching the spin reference", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 1,
          }),
        ).toBe("M87 15V51H51V15H75V39H63V27");
      });

      it("rotates unit 2 by 180°, matching the spin reference", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 2,
          }),
        ).toBe("M135 51H99V15H135V39H111V27H123");
      });

      it("rotates unit 3 by 270°, matching the spin reference", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 3,
          }),
        ).toBe("M147 51V15H183V51H159V27H171V39");
      });

      it("cycles unit 4 back to unit 0's orientation, matching the spin reference", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 4,
          }),
        ).toBe("M195 15H231V51H195V27H219V39H207");
      });
    });

    describe("with the spin-flip modifier", () => {
      const modifier = { name: "spin-flip" } as const;

      it("mirrors unit 0 (no rotation), idealized past the inconsistent hand-drawn reference", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 0,
          }),
        ).toBe("M3 51H39V15H3V39H27V27H15");
      });

      it("rotates then mirrors unit 1, matching the corrected reference geometry", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 1,
          }),
        ).toBe("M87 51V15H51V51H75V27H63V39");
      });

      it("rotates then mirrors unit 2, matching the corrected reference geometry", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 2,
          }),
        ).toBe("M135 15H99V51H135V27H111V39H123");
      });

      it("rotates then mirrors unit 3, matching the corrected reference geometry", () => {
        const geometry = gridGeometryService.compute(5);

        expect(
          service.path(geometry, {
            isLastUnit: false,
            modifier,
            rows: 5,
            unitIndex: 3,
          }),
        ).toBe("M147 15V51H183V15H159V39H171V27");
      });
    });
  });

  describe("border", () => {
    it("spans from the left edge to the last unit's rightmost point", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.border(geometry, { repeatCount: 6, rows: 5 })).toBe(
        "M279 63H3M279 3H3",
      );
    });
  });

  describe("last unit", () => {
    const rowsValues = [3, 4, 5, 6, 7, 8];

    it.each(rowsValues)(
      "already ends the shared border flush with its own spiral, needing no clipping, at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);
        const repeatCount = 6;
        const border = service.border(geometry, { repeatCount, rows });
        const lastUnit = service.path(geometry, {
          isLastUnit: true,
          rows,
          unitIndex: repeatCount - 1,
        });

        expect(rightmostX(border)).toBe(rightmostX(lastUnit));
      },
    );

    it.each(rowsValues)(
      "draws the same path whether or not it is the pattern's last, at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);

        expect(
          service.path(geometry, { isLastUnit: true, rows, unitIndex: 5 }),
        ).toBe(
          service.path(geometry, { isLastUnit: false, rows, unitIndex: 5 }),
        );
      },
    );
  });
});
