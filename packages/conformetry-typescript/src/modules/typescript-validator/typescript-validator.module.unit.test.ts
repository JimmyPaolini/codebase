import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { TypescriptValidatorModule } from "./typescript-validator.module";
import { TypescriptValidatorService } from "./typescript-validator.service";

describe(TypescriptValidatorModule, () => {
  it("exports and provides TypescriptValidatorService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      TypescriptValidatorModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      TypescriptValidatorModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(TypescriptValidatorService);
    expect(providersMetadata).toContain(TypescriptValidatorService);
  });
});
