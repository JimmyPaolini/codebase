import { describe, expect, it } from "vitest";

import {
  longestRun,
  neighborPairs,
  rowTouchCount,
  strands,
} from "./path.utilities";

describe("path utilities", () => {
  describe(neighborPairs, () => {
    it("pairs each item with the next along an open sequence", () => {
      expect(neighborPairs([1, 2, 3], false)).toStrictEqual([
        [1, 2],
        [2, 3],
      ]);
    });

    it("also pairs the last item with the first along a closed sequence", () => {
      expect(neighborPairs([1, 2, 3], true)).toStrictEqual([
        [1, 2],
        [2, 3],
        [3, 1],
      ]);
    });

    it("never pairs a lone item with itself", () => {
      expect(neighborPairs([1], true)).toStrictEqual([]);
    });
  });

  describe(longestRun, () => {
    it("reads an open sequence without wrapping", () => {
      expect(longestRun([1, -1, -1, 1, 1], false)).toBe(2);
    });

    it("joins the run that wraps around a closed sequence", () => {
      expect(longestRun([1, -1, -1, 1, 1], true)).toBe(3);
    });

    it("counts every turn of a closed sequence that never changes hand", () => {
      expect(longestRun([-1, -1, -1], true)).toBe(3);
    });

    it("is zero for a strand that never turns", () => {
      expect(longestRun([], true)).toBe(0);
      expect(longestRun([], false)).toBe(0);
    });
  });

  describe(strands, () => {
    it("reads nothing from a repeat with no edges", () => {
      expect(strands([])).toStrictEqual([]);
    });

    it("reads a single-column self-loop as one closed strand going straight on", () => {
      expect(strands([{ from: "0,0", to: "0,0" }])).toStrictEqual([
        { closed: true, turns: [0] },
      ]);
    });

    it("reads a two-column row's pair of edges between the same two points as one closed strand", () => {
      expect(
        strands([
          { from: "0,0", to: "0,1" },
          { from: "0,1", to: "0,0" },
        ]),
      ).toStrictEqual([{ closed: true, turns: [0, 0] }]);
    });
  });

  describe(rowTouchCount, () => {
    it("is zero for a row no edge reaches", () => {
      expect(rowTouchCount([{ from: "0,0", to: "1,0" }], 2)).toBe(0);
    });

    it("merges a run that wraps across the tile boundary into one touch", () => {
      expect(
        rowTouchCount(
          [
            { from: "0,2", to: "0,0" },
            { from: "0,0", to: "0,1" },
          ],
          0,
        ),
      ).toBe(1);
    });

    it("counts each separate run along the row", () => {
      expect(
        rowTouchCount(
          [
            { from: "0,0", to: "1,0" },
            { from: "0,2", to: "1,2" },
          ],
          0,
        ),
      ).toBe(2);
    });
  });
});
