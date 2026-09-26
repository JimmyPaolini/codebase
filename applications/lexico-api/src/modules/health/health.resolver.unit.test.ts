import { describe, expect, it } from "vitest";

import { HealthResolver } from "./health.resolver";
import { HealthService } from "./health.service";

describe("health resolver suite", () => {
  it("returns health check status from service", () => {
    expect.hasAssertions();

    const service = new HealthService();
    const resolver = new HealthResolver(service);

    expect(resolver.health()).toBe(true);
  });
});
