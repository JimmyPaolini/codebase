import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { LanguageModule } from "./language.module";
import { LanguageService } from "./language.service";

describe(LanguageModule, () => {
  it("exports and provides LanguageService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      LanguageModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      LanguageModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(LanguageService);
    expect(providersMetadata).toContain(LanguageService);
  });
});
