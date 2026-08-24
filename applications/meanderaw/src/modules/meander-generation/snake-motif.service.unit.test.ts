import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "./grid-geometry.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";

describe(SnakeMotifService, () => {
  let service: SnakeMotifService;
  let gridGeometryService: GridGeometryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SnakeMotifService, GridGeometryService, SnakeSequenceService],
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
  });

  describe("rightEdge", () => {
    it("spans repeatCount units, matching the reference geometry at 4 rows", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.rightEdge(geometry, 4, 6)).toBe(273.75);
    });
  });

  describe("borderSegment", () => {
    it("spans just one unit's width, unlike boxes's shared full-pattern border", () => {
      const geometry = gridGeometryService.compute(4);

      expect(service.borderSegment(geometry, 0, 4)).toBe(
        "M3.75 3.75H48.75M48.75 63.75H3.75",
      );
    });
  });
});
