import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { rightmostX, splitTrace } from "../../../testing/path-data";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";
import { SnakeMotifService } from "../snake-motif/snake-motif.service";
import { SnakeSequenceService } from "../snake-motif/snake-sequence.service";

import { WhirlMotifService } from "./whirl-motif.service";

// 🧪 Tests

describe(WhirlMotifService, () => {
  let service: WhirlMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WhirlMotifService,
        GridGeometryService,
        MotifTransformsService,
        SnakeMotifService,
        SnakeSequenceService,
      ],
    }).compile();

    service = await module.resolve(WhirlMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("unitWidth", () => {
    it("spans rows grid levels, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.unitWidth(geometry, 5)).toBe(60);
    });

    it("doubles for bare flip's fused mirrored twin", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.unitWidth(geometry, 6, { name: "flip" })).toBe(120);
    });
  });

  describe("path", () => {
    it("draws the first unit's single-arm spiral plus its own border, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 5, unitIndex: 0 }),
      ).toBe("M3 51V15H39V39H27V27H15V51H51V15M3 3H63M63 63H3");
    });

    it("shifts each subsequent unit by unitWidth, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 5, unitIndex: 1 }),
      ).toBe("M63 51V15H99V39H87V27H75V51H111V15M63 3H123M123 63H63");
    });

    it("fuses a mirrored twin onto unit 0's own tile under flip, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "flip" },
          rows: 4,
          unitIndex: 0,
        }),
      ).toBe(
        "M3.75 48.75V18.75H33.75V33.75H18.75V48.75H48.75V18.75M108.75 48.75V18.75H78.75V33.75H93.75V48.75H63.75V18.75M3.75 3.75H123.75M123.75 63.75H3.75",
      );
    });

    it("translates unit 1's identical fused tile by the doubled flip pitch, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "flip" },
          rows: 4,
          unitIndex: 1,
        }),
      ).toBe(
        "M123.75 48.75V18.75H153.75V33.75H138.75V48.75H168.75V18.75M228.75 48.75V18.75H198.75V33.75H213.75V48.75H183.75V18.75M123.75 3.75H243.75M243.75 63.75H123.75",
      );
    });
  });

  describe("rightEdge", () => {
    it("spans repeatCount units, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.rightEdge(geometry, { repeatCount: 6, rows: 5 })).toBe(
        363,
      );
    });
  });

  describe("borderSegment", () => {
    it("draws the bottom segment reversed relative to the top, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(
        service.borderSegment(geometry, {
          isLastUnit: false,
          rows: 5,
          xOffset: 0,
        }),
      ).toBe("M3 3H63M63 63H3");
    });
  });

  describe.each([
    ["plain", undefined],
    ["flip", { name: "flip" } as const],
  ])("last unit's border with %s", (_label, modifier) => {
    const rowsValues = [4, 5, 6, 7, 8];

    it.each(rowsValues)(
      "ends flush with the rightmost point its own trace reaches, at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);
        const unitIndex = 5;
        const xOffset = unitIndex * service.unitWidth(geometry, rows, modifier);
        const options = {
          isLastUnit: true,
          rows,
          xOffset,
          ...(modifier ? { modifier } : {}),
        };
        const { border, trace } = splitTrace(
          service.path(geometry, {
            isLastUnit: true,
            rows,
            unitIndex,
            ...(modifier ? { modifier } : {}),
          }),
          service.borderSegment(geometry, options),
        );

        expect(rightmostX(border)).toBe(rightmostX(trace));
      },
    );

    it.each(rowsValues)(
      "reaches a full unit width for an interior unit, staying contiguous with the next one, at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);
        const unitIndex = 5;
        const unitWidth = service.unitWidth(geometry, rows, modifier);
        const options = {
          isLastUnit: false,
          rows,
          xOffset: unitIndex * unitWidth,
          ...(modifier ? { modifier } : {}),
        };

        expect(
          rightmostX(service.borderSegment(geometry, options)),
        ).toBeCloseTo(geometry.offset + (unitIndex + 1) * unitWidth, 4);
      },
    );
  });
});
