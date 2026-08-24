import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MotifTransformsService } from "./motif-transforms.service";

import type { MotifLevelPoint } from "./meander-generation.types";

describe(MotifTransformsService, () => {
  let service: MotifTransformsService;

  // Reference geometry: the 5-rows `boxes` spiral's grid-level points and
  // bounding-box center, taken from `boxes-motif.service.ts`'s
  // `spiralPoints`/`centerPoint` for `rows = 5` and verified against
  // `/Users/jimmypaolini/Desktop/meanders/5 rows boxes.svg`.
  const points: MotifLevelPoint[] = [
    [0, 1],
    [3, 1],
    [3, 4],
    [0, 4],
    [0, 2],
    [2, 2],
    [2, 3],
    [1, 3],
  ];
  const center: MotifLevelPoint = [1.5, 2.5];

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

  describe("alternate", () => {
    it("switches column every level at period 1, matching the real edges decoded from 8 rows bars alternated.svg", () => {
      expect(service.alternate(1, 7, 1)).toStrictEqual([
        { column: 0, fromLevel: 1, toLevel: 2 },
        { column: 1, fromLevel: 2, toLevel: 3 },
        { column: 0, fromLevel: 3, toLevel: 4 },
        { column: 1, fromLevel: 4, toLevel: 5 },
        { column: 0, fromLevel: 5, toLevel: 6 },
        { column: 1, fromLevel: 6, toLevel: 7 },
      ]);
    });

    it("holds each column for a longer run at period 2", () => {
      expect(service.alternate(1, 7, 2)).toStrictEqual([
        { column: 0, fromLevel: 1, toLevel: 3 },
        { column: 1, fromLevel: 3, toLevel: 5 },
        { column: 0, fromLevel: 5, toLevel: 7 },
      ]);
    });

    it("shortens the final run when the interval doesn't divide evenly by the period", () => {
      expect(service.alternate(1, 4, 2)).toStrictEqual([
        { column: 0, fromLevel: 1, toLevel: 3 },
        { column: 1, fromLevel: 3, toLevel: 4 },
      ]);
    });

    it("returns an empty sequence for a zero-length interval", () => {
      expect(service.alternate(1, 1, 1)).toStrictEqual([]);
    });
  });

  describe("dotLevels", () => {
    it("steps straight down through every odd level once per period for up, matching 6 rows bars dot up.svg", () => {
      expect(service.dotLevels(6, "up")).toStrictEqual([5, 3, 1]);
    });

    it("steps straight down through every odd level once per period for up, matching 8 rows bars dot up.svg", () => {
      expect(service.dotLevels(8, "up")).toStrictEqual([7, 5, 3, 1]);
    });

    it("mirrors back up through the interior levels for bounce, matching 6 rows bars dot bounce.svg", () => {
      expect(service.dotLevels(6, "bounce")).toStrictEqual([5, 3, 1, 3]);
    });

    it("mirrors back up through the interior levels for bounce, matching 8 rows bars dot bounce.svg", () => {
      expect(service.dotLevels(8, "bounce")).toStrictEqual([7, 5, 3, 1, 3, 5]);
    });

    it("has no interior level to mirror when only two levels exist, so bounce matches up", () => {
      expect(service.dotLevels(4, "bounce")).toStrictEqual([3, 1]);
      expect(service.dotLevels(4, "up")).toStrictEqual([3, 1]);
    });

    it("trims to one level below rows - 1 at odd rows, since rows - 1 is even and would swallow the dot into a run", () => {
      expect(service.dotLevels(5, "up")).toStrictEqual([3, 1]);
      expect(service.dotLevels(5, "bounce")).toStrictEqual([3, 1]);
      expect(service.dotLevels(7, "up")).toStrictEqual([5, 3, 1]);
      expect(service.dotLevels(7, "bounce")).toStrictEqual([5, 3, 1, 3]);
    });

    it("returns every level odd, regardless of rows's parity, since an even level would sit on a run rather than a gap", () => {
      const rowsValues = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      for (const rows of rowsValues) {
        for (const level of service.dotLevels(rows, "bounce")) {
          expect(level % 2).toBe(1);
        }
        for (const level of service.dotLevels(rows, "up")) {
          expect(level % 2).toBe(1);
        }
      }
    });
  });

  describe("closeEdge", () => {
    // Reference geometry: the 6-rows `snake`/`chain` zigzag, taken from
    // `SnakeSequenceService.points(6)` and verified against
    // `/Users/jimmypaolini/Desktop/meanders/6 rows snake edge.svg`.
    const zigzag: MotifLevelPoint[] = [
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
