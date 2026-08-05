import { MODULE_METADATA } from "@nestjs/common/constants";
import { DiscoveryModule } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { MainModule } from "./main.module";
import { LoggerModule } from "./modules/logger/logger.module";

describe(MainModule, () => {
  it("imports DiscoveryModule and LoggerModule", () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, MainModule) as
      | undefined
      | unknown[];

    expect(imports).toBeDefined();
    expect(imports).toContain(DiscoveryModule);
    expect(imports).toContain(LoggerModule);
  });
});
