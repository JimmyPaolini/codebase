import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { JupyterValidatorModule } from "./jupyter-validator.module";
import { JupyterValidatorService } from "./jupyter-validator.service";

describe(JupyterValidatorModule, () => {
  it("exports and provides JupyterValidatorService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      JupyterValidatorModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      JupyterValidatorModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(JupyterValidatorService);
    expect(providersMetadata).toContain(JupyterValidatorService);
  });
});
