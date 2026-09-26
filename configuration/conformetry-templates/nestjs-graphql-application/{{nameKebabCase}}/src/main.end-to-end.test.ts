import { describe, expect, it } from "vitest";

import { environmentSchema } from "./main.constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("applies defaults for an empty config", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        APPLICATION_PORT: 3000,
        LIGHTSHIP_PORT: 9000,
      });
    });
  });
});
