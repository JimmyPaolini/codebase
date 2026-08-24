import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { CodependixCommand } from "./codependix.command";
import { CodependixModule } from "./codependix.module";
import { CodependixService } from "./codependix.service";

describe(CodependixModule, () => {
  it("exports CodependixService and provides both the command and the service", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      CodependixModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      CodependixModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(CodependixService);
    expect(providersMetadata).toContain(CodependixService);
    expect(providersMetadata).toContain(CodependixCommand);
  });
});
