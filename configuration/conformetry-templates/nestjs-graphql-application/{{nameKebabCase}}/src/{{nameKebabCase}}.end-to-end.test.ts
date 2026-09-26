import { describe, expect, it } from "vitest";

import { environmentSchema } from "./{{nameKebabCase}}.constants";

describe("{{nameKebabCase}} end-to-end suite", () => {
  describe("environment schema e2e", () => {
    it("applies defaults for an empty config", () => {
      expect.hasAssertions();
      expect(environmentSchema.parse({})).toStrictEqual({
        {{nameConstantCase}}_LIGHTSHIP_PORT: 9000,
        {{nameConstantCase}}_PORT: 3000,
      });
    });
  });
});
