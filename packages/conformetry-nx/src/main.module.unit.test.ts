import { describe, expect, it } from "vitest";

import { MainModule } from "./main.module";

describe(MainModule, () => {
  it("is defined", () => {
    expect(MainModule).toBeDefined();
  });
});
