import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ImportGraphModule } from "./import-graph.module";
import { ImportGraphService } from "./import-graph.service";

describe(ImportGraphModule, () => {
  it("exports and provides ImportGraphService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ImportGraphModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ImportGraphModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ImportGraphService);
    expect(providersMetadata).toContain(ImportGraphService);
  });
});
