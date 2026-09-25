import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("main end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("applies defaults for an empty config", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        LIGHTSHIP_PORT: 9000,
        PORT: 8398,
        POSTGRES_DB: "postgres",
        POSTGRES_HOST: "localhost",
        POSTGRES_PASSWORD: "postgres",
        POSTGRES_PORT: 5432,
        POSTGRES_USER: "postgres",
      });
    });
  });
});
