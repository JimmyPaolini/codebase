import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "./grid-geometry.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";

describe(SnakeMotifService, () => {
  let service: SnakeMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SnakeMotifService,
        GridGeometryService,
        MotifTransformsService,
        SnakeSequenceService,
      ],
    }).compile();

    service = await module.resolve(SnakeMotifService);
    gridGeometryService = await module.resolve(GridGeometryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("unitWidth", () => {
    it("spans every grid level the zigzag reaches, matching the reference geometry", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.unitWidth(geometry, 4)).toBe(45);
    });

    it("widens to rows grid levels for the edge family", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.unitWidth(geometry, 6, { name: "edge" })).toBe(60);
    });

    it("spans twice rows-minus-two grid levels for bare flip's fused tile", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.unitWidth(geometry, 6, { name: "flip" })).toBe(80);
    });
  });

  describe("path", () => {
    it("draws the first unit's zigzag plus its own border, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.path(geometry, { rows: 4, unitIndex: 0 })).toBe(
        "M3.75 18.75H33.75V33.75H18.75V48.75H48.75V18.75M3.75 3.75H48.75M48.75 63.75H3.75",
      );
    });

    it("shifts each subsequent unit by unitWidth, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.path(geometry, { rows: 4, unitIndex: 1 })).toBe(
        "M48.75 18.75H78.75V33.75H63.75V48.75H93.75V18.75M48.75 3.75H93.75M93.75 63.75H48.75",
      );
    });

    it("matches the reference geometry at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(service.path(geometry, { rows: 6, unitIndex: 0 })).toBe(
        "M2.5 12.5H42.5V42.5H22.5V32.5H32.5V22.5H12.5V52.5H52.5V12.5M2.5 2.5H52.5M52.5 62.5H2.5",
      );
    });

    it("closes flush against the border for edge, matching the reference geometry at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          modifier: { name: "edge" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.5 62.5V12.5H42.5V42.5H22.5V32.5H32.5V22.5H12.5V52.5H52.5V2.5M2.5 2.5H62.5M62.5 62.5H2.5",
      );
    });

    it("fuses a mirrored twin into unit 0's own tile under flip, matching the reference geometry at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          modifier: { name: "flip" },
          rows: 6,
          unitIndex: 0,
        }),
      ).toBe(
        "M2.5 12.5H42.5V42.5H22.5V32.5H32.5V22.5H12.5V52.5H82.5V22.5H62.5V32.5H72.5V42.5H52.5V12.5H82.5M2.5 2.5H82.5M82.5 62.5H2.5",
      );
    });

    it("translates unit 1's identical fused tile by the widened flip pitch, matching the reference geometry at 6 rows", () => {
      const geometry = gridGeometryService.compute(6);

      expect(
        service.path(geometry, {
          modifier: { name: "flip" },
          rows: 6,
          unitIndex: 1,
        }),
      ).toBe(
        "M82.5 12.5H122.5V42.5H102.5V32.5H112.5V22.5H92.5V52.5H162.5V22.5H142.5V32.5H152.5V42.5H132.5V12.5H162.5M82.5 2.5H162.5M162.5 62.5H82.5",
      );
    });
  });

  describe("rightEdge", () => {
    it("spans repeatCount units, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.rightEdge(geometry, { repeatCount: 6, rows: 4 })).toBe(
        273.75,
      );
    });

    it("spans repeatCount units of the widened edge pitch", () => {
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

  describe("borderSegment", () => {
    it("spans just one unit's width, unlike boxes's shared full-pattern border", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.borderSegment(geometry, { rows: 4, xOffset: 0 })).toBe(
        "M3.75 3.75H48.75M48.75 63.75H3.75",
      );
    });
  });
});
