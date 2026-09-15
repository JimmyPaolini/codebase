import { describe, expect, it } from "vitest";
import { z } from "zod";

import { environmentSchema } from "./constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        SWEEP_EDGE_BUDGET: 16,
        SWEEP_MAXIMUM_COLUMNS: Number.MAX_SAFE_INTEGER,
        SWEEP_MAXIMUM_ROWS: Number.MAX_SAFE_INTEGER,
      });
    });

    it("coerces every configured sweep bound from its string environment value", () => {
      expect(
        environmentSchema.parse({
          SWEEP_EDGE_BUDGET: "10",
          SWEEP_MAXIMUM_COLUMNS: "3",
          SWEEP_MAXIMUM_ROWS: "4",
        }),
      ).toStrictEqual({
        SWEEP_EDGE_BUDGET: 10,
        SWEEP_MAXIMUM_COLUMNS: 3,
        SWEEP_MAXIMUM_ROWS: 4,
      });
    });

    it.each([
      ["SWEEP_EDGE_BUDGET", "0"],
      ["SWEEP_EDGE_BUDGET", "-1"],
      ["SWEEP_EDGE_BUDGET", "abc"],
      ["SWEEP_EDGE_BUDGET", "1.5"],
      ["SWEEP_MAXIMUM_ROWS", "0"],
      ["SWEEP_MAXIMUM_ROWS", "-3"],
      ["SWEEP_MAXIMUM_ROWS", "abc"],
      ["SWEEP_MAXIMUM_ROWS", "2.5"],
      ["SWEEP_MAXIMUM_COLUMNS", "0"],
      ["SWEEP_MAXIMUM_COLUMNS", "-3"],
      ["SWEEP_MAXIMUM_COLUMNS", "abc"],
      ["SWEEP_MAXIMUM_COLUMNS", "2.5"],
    ])(
      "fails at startup rather than mid-sweep when %s is the malformed or out-of-range value %s",
      (key, value) => {
        expect(() => environmentSchema.parse({ [key]: value })).toThrow(
          z.ZodError,
        );
      },
    );
  });
});
