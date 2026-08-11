import { describe, expect, it } from "vitest";

import { LoggerModule } from "./logger.module.js";

describe(LoggerModule, () => {
  it("is defined", () => {
    expect(LoggerModule).toBeDefined();
  });
});
