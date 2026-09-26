import { describe, expect, it } from "vitest";

import { HealthService } from "./health.service";

describe("health service suite", () => {
  it("returns true for isHealthy", () => {
    expect.hasAssertions();

    const service = new HealthService();

    expect(service.isHealthy()).toBe(true);
  });
});
