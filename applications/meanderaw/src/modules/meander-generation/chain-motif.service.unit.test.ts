import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ChainMotifService } from "./chain-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";

describe(ChainMotifService, () => {
  let service: ChainMotifService;
  let gridGeometryService: GridGeometryService;

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
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("path", () => {
    it("draws two subpaths omitting the center-connecting segment, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.path(geometry, { rows: 4, unitIndex: 0 })).toBe(
        "M3.75 18.75H33.75V33.75M18.75 33.75V48.75H48.75V18.75M3.75 3.75H48.75M48.75 63.75H3.75",
      );
    });

    it("shifts each subsequent unit by unitWidth, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.path(geometry, { rows: 4, unitIndex: 1 })).toBe(
        "M48.75 18.75H78.75V33.75M63.75 33.75V48.75H93.75V18.75M48.75 3.75H93.75M93.75 63.75H48.75",
      );
    });

    it("produces the same edge set as snake minus one segment, at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.path(geometry, { rows: 6, unitIndex: 0 })).toBe(
        "M2.5 12.5H42.5V42.5H22.5V32.5M32.5 32.5V22.5H12.5V52.5H52.5V12.5M2.5 2.5H52.5M52.5 62.5H2.5",
      );
    });

    it("closes flush against the border for edge, shifting the split by the prepended connector", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          modifier: { name: "edge" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.5 62.5V12.5H42.5V42.5H22.5V32.5M32.5 32.5V22.5H12.5V52.5H52.5V2.5M2.5 2.5H62.5M62.5 62.5H2.5",
      );
    });

    it("mirrors the second (odd-indexed) unit under flip", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          modifier: { name: "flip" },
          rows: 6,
          unitIndex: 1,
        }),
      ).not.toBe(service.path(geometry, { rows: 6, unitIndex: 1 }));
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
});
