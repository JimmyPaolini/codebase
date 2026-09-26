import { describe, expect, it } from "vitest";

import { environmentSchema } from "./lexico-api.constants";

describe("lexico api end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("applies defaults for an empty config", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        LEXICO_API_LIGHTSHIP_PORT: 9000,
        LEXICO_API_PORT: 8398,
        POSTGRES_DB: "postgres",
        POSTGRES_HOST: "localhost",
        POSTGRES_PASSWORD: "postgres",
        POSTGRES_PORT: 5432,
        POSTGRES_USER: "postgres",
      });
    });
  });
});
