import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { rightmostX, splitTrace } from "../../../testing/path-data";
import { GridGeometryService } from "../grid-geometry/grid-geometry.service";

import { ChainMotifService } from "./chain-motif.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";

// 🧪 Tests

describe(ChainMotifService, () => {
  let service: ChainMotifService;
  let gridGeometryService: GridGeometryService;
  let snakeMotifService: SnakeMotifService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChainMotifService,
        GridGeometryService,
        MotifTransformsService,
        SnakeMotifService,
        SnakeSequenceService,
      ],
    }).compile();

    service = await module.resolve(ChainMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
    snakeMotifService = await module.resolve(SnakeMotifService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("path", () => {
    it("draws two subpaths omitting the center-connecting segment, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 4, unitIndex: 0 }),
      ).toBe(
        "M3.75 18.75H33.75V33.75M18.75 33.75V48.75H48.75V18.75M3.75 3.75H48.75M48.75 63.75H3.75",
      );
    });

    it("shifts each subsequent unit by unitWidth, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 4, unitIndex: 1 }),
      ).toBe(
        "M48.75 18.75H78.75V33.75M63.75 33.75V48.75H93.75V18.75M48.75 3.75H93.75M93.75 63.75H48.75",
      );
    });

    it("produces the same edge set as snake minus one segment, at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, { isLastUnit: false, rows: 6, unitIndex: 0 }),
      ).toBe(
        "M2.5 12.5H42.5V42.5H22.5V32.5M32.5 32.5V22.5H12.5V52.5H52.5V12.5M2.5 2.5H52.5M52.5 62.5H2.5",
      );
    });

    it("closes flush against the border for edge, shifting the split by the prepended connector", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "edge" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.5 62.5V12.5H42.5V42.5H22.5V32.5M32.5 32.5V22.5H12.5V52.5H52.5V2.5M2.5 2.5H62.5M62.5 62.5H2.5",
      );
    });

    it("draws three subpaths fusing a mirrored twin into unit 0's own tile under flip, matching the reference geometry at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "flip" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe(
        "M22.5 32.5V42.5H42.5V12.5H2.5M32.5 32.5V22.5H12.5V52.5H82.5V22.5H62.5V32.5M72.5 32.5V42.5H52.5V12.5H82.5M2.5 2.5H82.5M82.5 62.5H2.5",
      );
    });

    it("translates unit 1's identical fused tile by the widened flip pitch, matching the reference geometry at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          isLastUnit: false,
          modifier: { name: "flip" },
          rows: 6,
          unitIndex: 1,
        }),
      ).toBe(
        "M102.5 32.5V42.5H122.5V12.5H82.5M112.5 32.5V22.5H92.5V52.5H162.5V22.5H142.5V32.5M152.5 32.5V42.5H132.5V12.5H162.5M82.5 2.5H162.5M162.5 62.5H82.5",
      );
    });
  });

  describe("rightEdge", () => {
    it("delegates to snake, since chain shares snake's grid exactly", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.rightEdge(geometry, { repeatCount: 6, rows: 4 })).toBe(
        273.75,
      );
    });

    it("delegates the modifier through to snake's widened edge pitch", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.rightEdge(geometry, {
          modifier: { name: "edge" },
          repeatCount: 6,
          rows: 6,
        }),
      ).toBe(362.5);
    });
  });

  describe.each([
    ["plain", undefined],
    ["edge", { name: "edge" } as const],
    ["flip", { name: "flip" } as const],
    ["edge-flip", { name: "edge-flip" } as const],
  ])("last unit with %s", (_label, modifier) => {
    const rowsValues = [4, 5, 6, 7, 8];

    it.each(rowsValues)(
      "ends its border flush with the rightmost point its own chain reaches, at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);
        const unitIndex = 5;
        const options = {
          isLastUnit: true,
          rows,
          xOffset:
            unitIndex * snakeMotifService.unitWidth(geometry, rows, modifier),
          ...(modifier ? { modifier } : {}),
        };
        const { border, trace } = splitTrace(
          service.path(geometry, {
            isLastUnit: true,
            rows,
            unitIndex,
            ...(modifier ? { modifier } : {}),
          }),
          snakeMotifService.borderSegment(geometry, options),
        );

        expect(rightmostX(border)).toBe(rightmostX(trace));
      },
    );

    it.each(rowsValues)(
      "reaches the full unit pitch for an interior unit, staying contiguous with the next one, at %i rows",
      (rows) => {
        const geometry = gridGeometryService.compute(rows);
        const unitIndex = 5;
        const unitWidth = snakeMotifService.unitWidth(geometry, rows, modifier);
        const options = {
          isLastUnit: false,
          rows,
          xOffset: unitIndex * unitWidth,
          ...(modifier ? { modifier } : {}),
        };

        expect(
          rightmostX(snakeMotifService.borderSegment(geometry, options)),
        ).toBeCloseTo(geometry.offset + (unitIndex + 1) * unitWidth, 4);
      },
    );
  });
});
