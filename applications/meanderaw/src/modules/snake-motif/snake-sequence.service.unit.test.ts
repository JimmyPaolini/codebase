import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MotifTransformsService } from "../motif-transforms/motif-transforms.service";

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

  describe("flipPitchLevels", () => {
    it("is twice rows minus two, matching the reference geometry at 5 and 6 rows", () => {
      expect(service.flipPitchLevels(5)).toBe(6);
      expect(service.flipPitchLevels(6)).toBe(8);
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

    it("fuses a mirrored twin into the same tile for bare flip, matching the reference geometry at 6 rows", () => {
      expect(service.unitPoints(6, 0, { name: "flip" })).toStrictEqual([
        [0, 1],
        [4, 1],
        [4, 4],
        [2, 4],
        [2, 3],
        [3, 3],
        [3, 2],
        [1, 2],
        [1, 5],
        [8, 5],
        [8, 2],
        [6, 2],
        [6, 3],
        [7, 3],
        [7, 4],
        [5, 4],
        [5, 1],
        [8, 1],
      ]);
    });

    it("returns the identical fused tile for every unit index under bare flip, since the mirrored twin lives inside the tile rather than alternating", () => {
      expect(service.unitPoints(6, 1, { name: "flip" })).toStrictEqual(
        service.unitPoints(6, 0, { name: "flip" }),
      );
    });

    it("composes edge and flip for edge-flip on odd unit indices", () => {
      const edgeOnly = service.unitPoints(6, 1, { name: "edge" });
      const edgeFlip = service.unitPoints(6, 1, { name: "edge-flip" });

      expect(edgeFlip).not.toStrictEqual(edgeOnly);
      expect(edgeFlip).toHaveLength(edgeOnly.length);
    });
  });

  describe("unitTraceRightLevel", () => {
    it("agrees with the unit pitch when no modifier widens it", () => {
      expect(service.unitTraceRightLevel(6, undefined)).toBe(5);
      expect(service.unitTraceRightLevel(6, undefined)).toBe(
        service.unitWidthLevels(6, undefined),
      );
    });

    it("agrees with bare flip's fused tile pitch", () => {
      expect(service.unitTraceRightLevel(6, { name: "flip" })).toBe(
        service.unitWidthLevels(6, { name: "flip" }),
      );
    });

    it("falls one level short of the edge family's widened pitch", () => {
      for (const modifier of [
        { name: "edge" },
        { name: "edge-flip" },
      ] as const) {
        expect(service.unitTraceRightLevel(6, modifier)).toBe(
          service.unitWidthLevels(6, modifier) - 1,
        );
      }
    });

    it.each([4, 5, 6, 7, 8])(
      "reads the same for a mirrored unit, since the mirror is horizontal, at %i rows",
      (rows) => {
        const modifier = { name: "edge-flip" } as const;
        const rightmostOf = (unitIndex: number): number =>
          Math.max(
            ...service
              .unitPoints(rows, unitIndex, modifier)
              .map(([xLevel]) => xLevel),
          );

        expect(rightmostOf(0)).toBe(rightmostOf(1));
        expect(service.unitTraceRightLevel(rows, modifier)).toBe(
          rightmostOf(1),
        );
      },
    );
  });

  describe("unitWidthLevels", () => {
    it("spans rows minus one levels without a modifier", () => {
      expect(service.unitWidthLevels(6, undefined)).toBe(5);
    });

    it("doubles rows-minus-two levels for bare flip's fused tile", () => {
      expect(service.unitWidthLevels(6, { name: "flip" })).toBe(8);
    });

    it("widens to rows levels for the edge family", () => {
      expect(service.unitWidthLevels(6, { name: "edge" })).toBe(6);
      expect(service.unitWidthLevels(6, { name: "edge-flip" })).toBe(6);
    });
  });
});
