import { describe, expect, it } from "vitest";

import { countPointsWithExactArms } from "./submatrix.utilities";

import type { Matrix, MatrixPoint } from "../../matrix/matrix.types";

/** A point carrying exactly the named arms. */
function point(...arms: (keyof MatrixPoint)[]): MatrixPoint {
  return {
    east: arms.includes("east"),
    north: arms.includes("north"),
    south: arms.includes("south"),
    west: arms.includes("west"),
  };
}

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
