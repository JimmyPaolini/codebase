import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { GraphRunModule } from "./graph-run.module";
import { GraphRunService } from "./graph-run.service";

describe(GraphRunModule, () => {
  it("exports and provides GraphRunService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      GraphRunModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      GraphRunModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(GraphRunService);
    expect(providersMetadata).toContain(GraphRunService);
  });
});
