import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MotifTransformsService } from "./motif-transforms.service";
import { SnakeSequenceService } from "./snake-sequence.service";

describe(SnakeSequenceService, () => {
  let service: SnakeSequenceService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [SnakeSequenceService, MotifTransformsService],
    }).compile();

    service = await module.resolve(SnakeSequenceService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("points", () => {
    it("matches the reference geometry at the structural minimum of 4 rows", () => {
      expect(service.points(4)).toStrictEqual([
        [0, 1],
        [2, 1],
        [2, 2],
        [1, 2],
        [1, 3],
        [3, 3],
        [3, 1],
      ]);
    });

    it("matches the reference geometry at 5 rows", () => {
      expect(service.points(5)).toStrictEqual([
        [0, 1],
        [3, 1],
        [3, 3],
        [2, 3],
        [2, 2],
        [1, 2],
        [1, 4],
        [4, 4],
        [4, 1],
      ]);
    });

    it("matches the reference geometry at 6 rows", () => {
      expect(service.points(6)).toStrictEqual([
        [0, 1],
        [4, 1],
        [4, 4],
        [2, 4],
        [2, 3],
        [3, 3],
        [3, 2],
        [1, 2],
        [1, 5],
        [5, 5],
        [5, 1],
      ]);
    });

    it("matches the reference geometry at 7 rows", () => {
      expect(service.points(7)).toStrictEqual([
        [0, 1],
        [5, 1],
        [5, 5],
        [2, 5],
        [2, 3],
        [3, 3],
        [3, 4],
        [4, 4],
        [4, 2],
        [1, 2],
        [1, 6],
        [6, 6],
        [6, 1],
      ]);
    });

    it("visits every grid level from 1 to rows minus one exactly once", () => {
      const points = service.points(8);
      const visitedLevels = points.slice(1, -1).map(([, yLevel]) => yLevel);

      expect(new Set(visitedLevels).size).toBe(7);
      expect(Math.max(...visitedLevels)).toBe(7);
      expect(Math.min(...visitedLevels)).toBe(1);
    });
  });

  describe("unitPoints", () => {
    it("returns the base zigzag unmodified when there is no modifier", () => {
      expect(service.unitPoints(6, 0, undefined)).toStrictEqual(
        service.points(6),
      );
    });

    it("closes the sequence flush against the border for the edge family", () => {
      expect(service.unitPoints(6, 0, { name: "edge" })).toStrictEqual([
        [0, 6],
        [0, 1],
        [4, 1],
        [4, 4],
        [2, 4],
        [2, 3],
        [3, 3],
        [3, 2],
        [1, 2],
        [1, 5],
        [5, 5],
        [5, 0],
      ]);
    });

    it("leaves even unit indices not mirrored under flip", () => {
      expect(service.unitPoints(6, 0, { name: "flip" })).toStrictEqual(
        service.points(6),
      );
    });

    it("mirrors odd unit indices under flip across a horizontal line", () => {
      expect(service.unitPoints(6, 1, { name: "flip" })).toStrictEqual([
        [0, 5],
        [4, 5],
        [4, 2],
        [2, 2],
        [2, 3],
        [3, 3],
        [3, 4],
        [1, 4],
        [1, 1],
        [5, 1],
        [5, 5],
      ]);
    });

    it("composes edge and flip for edge-flip on odd unit indices", () => {
      const edgeOnly = service.unitPoints(6, 1, { name: "edge" });
      const edgeFlip = service.unitPoints(6, 1, { name: "edge-flip" });

      expect(edgeFlip).not.toStrictEqual(edgeOnly);
      expect(edgeFlip).toHaveLength(edgeOnly.length);
    });
  });

  describe("unitWidthLevels", () => {
    it("spans rows minus one levels without a modifier", () => {
      expect(service.unitWidthLevels(6, undefined)).toBe(5);
    });

    it("spans rows minus one levels for flip, which doesn't widen the pitch", () => {
      expect(service.unitWidthLevels(6, { name: "flip" })).toBe(5);
    });

    it("widens to rows levels for the edge family", () => {
      expect(service.unitWidthLevels(6, { name: "edge" })).toBe(6);
      expect(service.unitWidthLevels(6, { name: "edge-flip" })).toBe(6);
    });
  });
});
