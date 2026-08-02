import { describe, expect, it } from "vitest";

import { conformetryProjectName } from "./conformetry.config.js";

describe("init template conformetry config", () => {
  it("exports the name placeholder string", () => {
    expect(conformetryProjectName).toBe("{{name}}");
  });
});
