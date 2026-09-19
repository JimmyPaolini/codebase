import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("allows an empty schema to use defaults", () => {
      expect.hasAssertions();
      const parsed = environmentSchema.parse({});
      expect(parsed).toHaveProperty("SWEEP_EDGE_BUDGET");
    });
  });
});
