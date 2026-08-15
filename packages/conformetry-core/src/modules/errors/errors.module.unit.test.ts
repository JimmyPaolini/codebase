import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { ErrorsModule } from "./errors.module";
import { ErrorsService } from "./errors.service";

describe(ErrorsModule, () => {
  it("exports and provides ErrorsService", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      ErrorsModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ErrorsModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(ErrorsService);
    expect(providersMetadata).toContain(ErrorsService);
  });
});
