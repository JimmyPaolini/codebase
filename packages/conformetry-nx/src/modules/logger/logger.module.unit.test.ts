import { describe, expect, it } from "vitest";

import { LoggerModule } from "./logger.module";

describe(LoggerModule, () => {
  it("is defined", () => {
    expect(LoggerModule).toBeDefined();
  });
});
