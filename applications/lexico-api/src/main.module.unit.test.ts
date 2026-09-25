import { describe, expect, it } from "vitest";

import { MainModule } from "./main.module";

describe("main module suite", () => {
  it("instantiates MainModule", () => {
    expect.hasAssertions();

    const module = new MainModule();

    expect(module).toBeDefined();
  });
});
