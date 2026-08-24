import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";
import { SwirlMotifService } from "./swirl-motif.service";

describe(SwirlMotifService, () => {
  let service: SwirlMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SwirlMotifService,
        GridGeometryService,
        MotifTransformsService,
        SnakeMotifService,
        SnakeSequenceService,
      ],
    }).compile();

    service = await module.resolve(SwirlMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("unitWidth", () => {
    it("spans 2 * rows - 3 grid levels, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.unitWidth(geometry, 5)).toBe(84);
    });

    it("doubles for bare flip's fused mirrored twin", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.unitWidth(geometry, 6, { name: "flip" })).toBe(180);
    });
  });

  describe("path", () => {
    it("draws the first unit's two-armed spiral plus its own border, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.path(geometry, { rows: 5, unitIndex: 0 })).toBe(
        "M15 27V39H27V15H3V51H39V15H75V51H51V27H63V39M3 3H87M3 63H87",
      );
    });

    it("shifts each subsequent unit by unitWidth, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.path(geometry, { rows: 5, unitIndex: 1 })).toBe(
        "M99 27V39H111V15H87V51H123V15H159V51H135V27H147V39M87 3H171M87 63H171",
      );
    });

    it("fuses a mirrored twin onto unit 0's own tile under flip, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(
        service.path(geometry, {
          modifier: { name: "flip" },
          rows: 4,
          unitIndex: 0,
        }),
      ).toBe(
        "M18.75 33.75V18.75H3.75V48.75H33.75V18.75H63.75V48.75H48.75V33.75M123.75 33.75V18.75H138.75V48.75H108.75V18.75H78.75V48.75H93.75V33.75M3.75 3.75H153.75M3.75 63.75H153.75",
      );
    });

    it("translates unit 1's identical fused tile by the doubled flip pitch, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(
        service.path(geometry, {
          modifier: { name: "flip" },
          rows: 4,
          unitIndex: 1,
        }),
      ).toBe(
        "M168.75 33.75V18.75H153.75V48.75H183.75V18.75H213.75V48.75H198.75V33.75M273.75 33.75V18.75H288.75V48.75H258.75V18.75H228.75V48.75H243.75V33.75M153.75 3.75H303.75M153.75 63.75H303.75",
      );
    });
  });

  describe("rightEdge", () => {
    it("spans repeatCount units, matching the reference geometry at 5 rows", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.rightEdge(geometry, { repeatCount: 6, rows: 5 })).toBe(
        507,
      );
    });
  });

  describe("borderSegment", () => {
    it("draws both top and bottom segments in the same left-to-right direction, unlike snake/chain/whirl", () => {
      const geometry = gridGeometryService.compute(5);

      expect(service.borderSegment(geometry, { rows: 5, xOffset: 0 })).toBe(
        "M3 3H87M3 63H87",
      );
    });
  });
});
