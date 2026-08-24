import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { SizeAnalysisModule } from "./size-analysis.module";
import { SizeAnalysisService } from "./size-analysis.service";

describe(SizeAnalysisModule, () => {
  it("exports and provides SizeAnalysisService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      SizeAnalysisModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      SizeAnalysisModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(SizeAnalysisService);
    expect(providersMetadata).toContain(SizeAnalysisService);
  });
});
