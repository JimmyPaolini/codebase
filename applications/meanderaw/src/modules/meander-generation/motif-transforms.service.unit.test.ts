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

  describe("rightmostLevel", () => {
    it("reports the largest x level across every subpath", () => {
      expect(
        service.rightmostLevel([
          [
            [0, 1],
            [3, 1],
          ],
          [
            [7, 2],
            [2, 2],
          ],
        ]),
      ).toBe(7);
    });

    it("reads a single subpath the same way", () => {
      expect(
        service.rightmostLevel([
          [
            [1, 0],
            [4, 0],
            [4, 3],
          ],
        ]),
      ).toBe(4);
    });

    it("accepts a fractional level, which the mirror pivot produces", () => {
      expect(
        service.rightmostLevel([
          [
            [0, 0],
            [6.5, 1],
          ],
        ]),
      ).toBe(6.5);
    });
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

  describe("columnSpans", () => {
    it("keeps only its own column's runs in the interior", () => {
      const runs = service.alternate(1, 7, 1);

      expect(service.columnSpans(runs, 0)).toStrictEqual([
        { fromLevel: 1, toLevel: 2 },
        { fromLevel: 3, toLevel: 4 },
        { fromLevel: 5, toLevel: 7 },
      ]);
    });

    it("draws the split's first and last run whichever column they were assigned to, so no gap touches either end", () => {
      const runs = service.alternate(1, 7, 1);

      expect(service.columnSpans(runs, 1)).toStrictEqual([
        { fromLevel: 1, toLevel: 3 },
        { fromLevel: 4, toLevel: 5 },
        { fromLevel: 6, toLevel: 7 },
      ]);
    });

    it("merges an absorbed end run into the neighboring span rather than emitting both", () => {
      const runs = service.alternate(1, 5, 1);

      expect(service.columnSpans(runs, 0)).toStrictEqual([
        { fromLevel: 1, toLevel: 2 },
        { fromLevel: 3, toLevel: 5 },
      ]);
    });

    it("fills solid when every run is either its own or an end run", () => {
      const runs = service.alternate(1, 3, 1);

      expect(service.columnSpans(runs, 1)).toStrictEqual([
        { fromLevel: 1, toLevel: 3 },
      ]);
    });

    it("returns an empty sequence for an empty split", () => {
      expect(service.columnSpans([], 0)).toStrictEqual([]);
    });
  });

  describe("dotLevels", () => {
    it("steps up two levels at a time from the bar's bottom end for up, matching 6 rows bars dot up.svg's column count", () => {
      expect(service.dotLevels(6, "up")).toStrictEqual([5, 3, 1]);
    });

    it("steps up two levels at a time from the bar's bottom end for up, matching 8 rows bars dot up.svg's column count", () => {
      expect(service.dotLevels(8, "up")).toStrictEqual([7, 5, 3, 1]);
    });

    it("mirrors back down through the interior levels for bounce, matching 6 rows bars dot bounce.svg's column count", () => {
      expect(service.dotLevels(6, "bounce")).toStrictEqual([5, 3, 1, 3]);
    });

    it("mirrors back down through the interior levels for bounce, matching 8 rows bars dot bounce.svg's column count", () => {
      expect(service.dotLevels(8, "bounce")).toStrictEqual([7, 5, 3, 1, 3, 5]);
    });

    it("has no interior level to mirror when only two levels exist, so bounce matches up", () => {
      expect(service.dotLevels(4, "bounce")).toStrictEqual([3, 1]);
      expect(service.dotLevels(4, "up")).toStrictEqual([3, 1]);
    });

    it("takes a three-level final step at odd rows so the ladder still ends on the bar's top level", () => {
      // Regression coverage for issue #339. The ladder used to be trimmed to
      // the largest ODD level at odd rows, because `MosaicMotifService.dotPath`
      // only made a dot visible where a parity rule happened to skip both
      // adjacent runs. `dotPath` now draws the bar around the dot instead, so
      // the ladder is free to run end to end — but it must still clear levels
      // `2` and `rows - 2`, where the span beyond the dot would collapse to a
      // bare square mark indistinguishable from the dot itself.
      expect(service.dotLevels(5, "up")).toStrictEqual([4, 1]);
      expect(service.dotLevels(5, "bounce")).toStrictEqual([4, 1]);
      expect(service.dotLevels(7, "up")).toStrictEqual([6, 4, 1]);
      expect(service.dotLevels(7, "bounce")).toStrictEqual([6, 4, 1, 4]);
    });

    // From `DOT_MINIMUM_ROWS` up. At 3 rows the bar is one grid level long,
    // the ladder is the single rung `[1]`, and `MosaicMotifService.path` never
    // routes to `dotPath` at all.
    it.each([4, 5, 6, 7, 8, 9, 10, 11, 12])(
      "spans the bar end to end at %i rows while clearing the two levels that would collapse a span",
      (rows) => {
        for (const shape of ["bounce", "up"] as const) {
          const levels = service.dotLevels(rows, shape);

          expect(Math.min(...levels)).toBe(1);
          expect(Math.max(...levels)).toBe(rows - 1);
          expect(levels).not.toContain(2);
          expect(levels).not.toContain(rows - 2);
        }
      },
    );

    it("keeps the period unchanged at every row count, so the canvas width is unaffected", () => {
      expect(service.dotLevels(3, "up")).toHaveLength(1);
      expect(service.dotLevels(9, "up")).toHaveLength(4);
      expect(service.dotLevels(9, "bounce")).toHaveLength(6);
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
