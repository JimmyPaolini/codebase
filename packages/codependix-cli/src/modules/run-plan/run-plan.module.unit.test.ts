import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { RunPlanModule } from "./run-plan.module";
import { RunPlanService } from "./run-plan.service";

describe(RunPlanModule, () => {
  it("exports and provides RunPlanService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      RunPlanModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      RunPlanModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(RunPlanService);
    expect(providersMetadata).toContain(RunPlanService);
  });
});
