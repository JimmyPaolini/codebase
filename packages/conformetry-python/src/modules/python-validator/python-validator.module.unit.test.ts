import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { PythonValidatorModule } from "./python-validator.module";
import { PythonValidatorService } from "./python-validator.service";

describe(PythonValidatorModule, () => {
  it("exports and provides PythonValidatorService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      PythonValidatorModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PythonValidatorModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(PythonValidatorService);
    expect(providersMetadata).toContain(PythonValidatorService);
  });
});
