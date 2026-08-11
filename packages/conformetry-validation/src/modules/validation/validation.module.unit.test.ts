import { describe, expect, it } from "vitest";

import { ValidationModule } from "./validation.module";

describe(ValidationModule, () => {
  it("is defined", () => {
    expect(ValidationModule).toBeDefined();
  });
});
