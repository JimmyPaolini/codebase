import { describe, expect, it } from "vitest";

import { environmentSchema } from "./modules/{{nameKebabCase}}/{{nameKebabCase}}.constants";

describe("environment schema e2e", () => {
  it("applies defaults for an empty config", () => {

    expect.hasAssertions();    expect(environmentSchema.parse({})).toStrictEqual({ PORT: 3000 });
  });
});
