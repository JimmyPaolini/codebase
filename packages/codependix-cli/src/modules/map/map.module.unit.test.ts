import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { MapCommand } from "./map.command";
import { MapModule } from "./map.module";
import { MapService } from "./map.service";

describe(MapModule, () => {
  it("exports MapService and provides both the command and the service", () => {
    const exportsMetadata = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      MapModule,
    ) as undefined | unknown[];
    const providersMetadata = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      MapModule,
    ) as undefined | unknown[];

    expect(exportsMetadata).toContain(MapService);
    expect(providersMetadata).toContain(MapService);
    expect(providersMetadata).toContain(MapCommand);
  });
});
