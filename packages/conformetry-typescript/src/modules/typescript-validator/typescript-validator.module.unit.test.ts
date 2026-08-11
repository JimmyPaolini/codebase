import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { TypeScriptValidatorModule } from "./typescript-validator.module";
import { TypeScriptValidatorService } from "./typescript-validator.service";

describe(TypeScriptValidatorModule, () => {
  it("exports and provides TypeScriptValidatorService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      TypeScriptValidatorModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      TypeScriptValidatorModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(TypeScriptValidatorService);
    expect(providersMetadata).toContain(TypeScriptValidatorService);
  });
});
