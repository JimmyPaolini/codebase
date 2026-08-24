import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { TypescriptProjectModule } from "./typescript-project.module";
import { TypescriptProjectService } from "./typescript-project.service";

describe(TypescriptProjectModule, () => {
  it("exports and provides TypescriptProjectService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      TypescriptProjectModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      TypescriptProjectModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(TypescriptProjectService);
    expect(providersMetadata).toContain(TypescriptProjectService);
  });
});
