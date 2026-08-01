import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("environment schema e2e", () => {
  it("allows an empty schema by default", () => {
    expect.hasAssertions();
    expect(environmentSchema.parse({})).toStrictEqual({});
  });
});
