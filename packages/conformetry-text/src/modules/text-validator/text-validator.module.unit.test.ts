import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { TextValidatorModule } from "./text-validator.module";
import { TextValidatorService } from "./text-validator.service";

describe(TextValidatorModule, () => {
  it("exports and provides TextValidatorService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      TextValidatorModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      TextValidatorModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(TextValidatorService);
    expect(providersMetadata).toContain(TextValidatorService);
  });
});
