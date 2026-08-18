import { describe, expect, it } from "vitest";

import { environmentSchema } from "./constants";

describe("callidescope environment", () => {
  it("accepts an environment declaring nothing", () => {
    expect(environmentSchema.parse({})).toStrictEqual({});
  });
});
