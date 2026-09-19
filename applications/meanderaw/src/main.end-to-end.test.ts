import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema by default", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        SWEEP_EDGE_BUDGET: expect.any(Number),
        SWEEP_MAXIMUM_COLUMNS: expect.any(Number),
        SWEEP_MAXIMUM_ROWS: expect.any(Number),
      });
    });
  });
});
