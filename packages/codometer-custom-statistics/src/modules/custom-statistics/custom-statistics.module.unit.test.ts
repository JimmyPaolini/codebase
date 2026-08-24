import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { CustomStatisticsModule } from "./custom-statistics.module";
import { CustomStatisticsService } from "./custom-statistics.service";

describe(CustomStatisticsModule, () => {
  it("exports and provides CustomStatisticsService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      CustomStatisticsModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CustomStatisticsModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(CustomStatisticsService);
    expect(providersMetadata).toContain(CustomStatisticsService);
  });
});
