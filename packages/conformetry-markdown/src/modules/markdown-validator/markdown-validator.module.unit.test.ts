import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { MarkdownValidatorModule } from "./markdown-validator.module";
import { MarkdownValidatorService } from "./markdown-validator.service";

describe(MarkdownValidatorModule, () => {
  it("exports and provides MarkdownValidatorService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      MarkdownValidatorModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      MarkdownValidatorModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(MarkdownValidatorService);
    expect(providersMetadata).toContain(MarkdownValidatorService);
  });
});
