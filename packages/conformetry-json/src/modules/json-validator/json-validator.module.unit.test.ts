import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { JsonValidatorModule } from "./json-validator.module";
import { JsonValidatorService } from "./json-validator.service";

describe(JsonValidatorModule, () => {
  it("exports and provides JsonValidatorService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      JsonValidatorModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      JsonValidatorModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(JsonValidatorService);
    expect(providersMetadata).toContain(JsonValidatorService);
  });
});
