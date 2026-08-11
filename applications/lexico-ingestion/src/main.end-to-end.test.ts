import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("environment schema e2e", () => {
  it("allows an empty schema by default", () => {
    expect.hasAssertions();
    expect(environmentSchema.parse({})).toStrictEqual({
      POSTGRES_DB: "postgres",
      POSTGRES_HOST: "localhost",
      POSTGRES_PASSWORD: "postgres",
      POSTGRES_PORT: 5432,
      POSTGRES_USER: "postgres",
    });
  });

  it("should parse an empty environment schema with defaults", () => {
    expect(environmentSchema.parse({})).toStrictEqual({
      POSTGRES_DB: "postgres",
      POSTGRES_HOST: "localhost",
      POSTGRES_PASSWORD: "postgres",
      POSTGRES_PORT: 5432,
      POSTGRES_USER: "postgres",
    });
  });
});
