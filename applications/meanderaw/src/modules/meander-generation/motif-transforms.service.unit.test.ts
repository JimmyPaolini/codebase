import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MotifTransformsService } from "./motif-transforms.service";

import type { SpiralLevelPoint } from "./meander-generation.types";

describe(MotifTransformsService, () => {
  let service: MotifTransformsService;

  // Reference geometry: the 5-rows `boxes` spiral's grid-level points and
  // bounding-box center, taken from `boxes-motif.service.ts`'s
  // `spiralPoints`/`centerPoint` for `rows = 5` and verified against
  // `/Users/jimmypaolini/Desktop/meanders/5 rows boxes.svg`.
  const points: SpiralLevelPoint[] = [
    [0, 1],
    [3, 1],
    [3, 4],
    [0, 4],
    [0, 2],
    [2, 2],
    [2, 3],
    [1, 3],
  ];
  const center: SpiralLevelPoint = [1.5, 2.5];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MotifTransformsService],
    }).compile();

    service = await module.resolve(MotifTransformsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("rotate", () => {
    it("leaves the sequence unchanged for zero quarter turns", () => {
      expect(service.rotate(points, center, 0)).toStrictEqual(points);
    });

    it("rotates 90° counterclockwise, matching unit 1 of the spin reference", () => {
      expect(service.rotate(points, center, 1)).toStrictEqual([
        [3, 1],
        [3, 4],
        [0, 4],
        [0, 1],
        [2, 1],
        [2, 3],
        [1, 3],
        [1, 2],
      ]);
    });

    it("rotates 180°, matching unit 2 of the spin reference", () => {
      expect(service.rotate(points, center, 2)).toStrictEqual([
        [3, 4],
        [0, 4],
        [0, 1],
        [3, 1],
        [3, 3],
        [1, 3],
        [1, 2],
        [2, 2],
      ]);
    });

    it("rotates 270° counterclockwise, matching unit 3 of the spin reference", () => {
      expect(service.rotate(points, center, 3)).toStrictEqual([
        [0, 4],
        [0, 1],
        [3, 1],
        [3, 4],
        [1, 4],
        [1, 2],
        [2, 2],
        [2, 3],
      ]);
    });

    it("normalizes a full extra turn back to the same result as zero", () => {
      expect(service.rotate(points, center, 4)).toStrictEqual(points);
    });

    it("normalizes a negative quarter turn to its positive equivalent", () => {
      expect(service.rotate(points, center, -1)).toStrictEqual(
        service.rotate(points, center, 3),
      );
    });
  });

  describe("closeEdge", () => {
    // Reference geometry: the 6-rows `snake`/`chain` zigzag, taken from
    // `SnakeSequenceService.points(6)` and verified against
    // `/Users/jimmypaolini/Desktop/meanders/6 rows snake edge.svg`.
    const zigzag: SpiralLevelPoint[] = [
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
    ];

    it("prepends a bottom-border connector and extends the last point onto the top border", () => {
      expect(service.closeEdge(zigzag, 6)).toStrictEqual([
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
  });

  describe("mirror", () => {
    it("reflects across a horizontal line through center, matching the spin-flip transform", () => {
      expect(service.mirror(points, center, "horizontal")).toStrictEqual([
        [0, 4],
        [3, 4],
        [3, 1],
        [0, 1],
        [0, 3],
        [2, 3],
        [2, 2],
        [1, 2],
      ]);
    });

    it("reflects across a vertical line through center", () => {
      expect(service.mirror(points, center, "vertical")).toStrictEqual([
        [3, 1],
        [0, 1],
        [0, 4],
        [3, 4],
        [3, 2],
        [1, 2],
        [1, 3],
        [2, 3],
      ]);
    });
  });
});
