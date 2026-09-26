import { describe, expect, it } from "vitest";

import {
  countIsolatedGlyphs,
  countPointsWithExactArms,
  glyphFormula,
  pointDigitAt,
} from "./submatrix.utilities";

import type {
  Matrix,
  MatrixPoint,
  MatrixPointArm,
} from "../../matrix/matrix.types";

/** A point carrying exactly the named arms. */
function point(...arms: MatrixPointArm[]): MatrixPoint {
  return {
    east: arms.includes("east"),
    north: arms.includes("north"),
    south: arms.includes("south"),
    west: arms.includes("west"),
  };
}

describe("submatrix utilities", () => {
  describe(countPointsWithExactArms, () => {
    const matrix: Matrix = [
      [point(), point("east", "west"), point("north", "east")],
      [point("north", "east", "west"), point(), point("east", "west")],
    ];

    it("counts only points whose arms are exactly the named set", () => {
      expect(countPointsWithExactArms(matrix, ["east", "west"])).toBe(2);
      expect(countPointsWithExactArms(matrix, ["north", "east"])).toBe(1);
    });

    it("treats an empty arm set as a bare point", () => {
      expect(countPointsWithExactArms(matrix, [])).toBe(2);
    });

    it("ignores the order the arms are named in", () => {
      expect(countPointsWithExactArms(matrix, ["west", "east"])).toBe(2);
    });

    it("counts nothing in an empty matrix", () => {
      expect(countPointsWithExactArms([], [])).toBe(0);
    });
  });

  describe(pointDigitAt, () => {
    const matrix: Matrix = [[point("north", "east"), point("south", "west")]];

    it("spells a point's arms as its hexadecimal Code digit", () => {
      expect(pointDigitAt(matrix, 0, 0)).toBe(10);
      expect(pointDigitAt(matrix, 0, 1)).toBe(5);
    });

    it("wraps columns in both directions", () => {
      expect(pointDigitAt(matrix, 0, 2)).toBe(10);
      expect(pointDigitAt(matrix, 0, -1)).toBe(5);
    });

    it("reads -1 past the top or bottom row", () => {
      expect(pointDigitAt(matrix, -1, 0)).toBe(-1);
      expect(pointDigitAt(matrix, 1, 0)).toBe(-1);
    });
  });

  describe(countIsolatedGlyphs, () => {
    const square: Matrix = [
      [point("south", "east"), point("south", "west"), point()],
      [point("north", "east"), point("north", "west"), point()],
    ];

    it("counts windows whose glyph points carry exactly the template's arms", () => {
      expect(countIsolatedGlyphs(square, ["65", "a9"])).toBe(1);
    });

    it("treats a blank template cell as outside the glyph, whatever ink it holds", () => {
      const beside: Matrix = [
        [point("south", "east"), point("south", "west"), point("south")],
        [point("north", "east"), point("north", "west"), point("north")],
      ];

      expect(countIsolatedGlyphs(beside, ["65.", "a9."])).toBe(1);
    });

    it("refuses a glyph with an arm its template lacks", () => {
      const joined: Matrix = [
        [point("south", "east"), point("south", "west", "east"), point("west")],
        [point("north", "east"), point("north", "west"), point()],
      ];

      expect(countIsolatedGlyphs(joined, ["65", "a9"])).toBe(0);
    });

    it("checks every glyph point, the first as much as the last", () => {
      const joinedAcrossTheSeam: Matrix = [
        [point("south", "east", "west"), point("south", "west"), point("east")],
        [point("north", "east"), point("north", "west"), point()],
      ];

      expect(countIsolatedGlyphs(joinedAcrossTheSeam, ["65", "a9"])).toBe(0);
    });

    it("matches a glyph that crosses the tile's seam", () => {
      const seam: Matrix = [
        [point("south", "west"), point(), point("south", "east")],
        [point("north", "west"), point(), point("north", "east")],
      ];

      expect(countIsolatedGlyphs(seam, ["65", "a9"])).toBe(1);
    });

    it("counts nothing when the glyph is wider than the tile or taller than the band", () => {
      // Two points whose digits repeat exactly around a 2-column tile: a
      // template naively wrapped past the guard would still match this
      // template at column 0, so the guard is what keeps the count at 0.
      const twoColumns: Matrix = [
        [point("south", "west"), point("north", "east")],
      ];

      expect(countIsolatedGlyphs(twoColumns, ["5a5a"])).toBe(0);
      expect(countIsolatedGlyphs(square, ["4", "c", "8"])).toBe(0);
      expect(countIsolatedGlyphs([], ["4", "8"])).toBe(0);
    });
  });

  describe(glyphFormula, () => {
    it("typesets the template as a matrix of digits with blanks as dots", () => {
      expect(glyphFormula(["4.", "a1"])).toBe(
        String.raw`\left|\left\{\, W \subseteq M : W \equiv \begin{matrix} 4 & \cdot \\ a & 1 \end{matrix},\ W \text{ isolated} \,\right\}\right|`,
      );
    });
  });
});
