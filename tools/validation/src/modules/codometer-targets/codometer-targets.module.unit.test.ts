import { describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logger";

import { CodometerTargetsCommand } from "./codometer-targets.command";
import { CodometerTargetsModule } from "./codometer-targets.module";
import { CodometerTargetsService } from "./codometer-targets.service";

describe(CodometerTargetsModule, () => {
  it("registers expected imports and providers", () => {
    expect.hasAssertions();

    const imports = Reflect.getMetadata("imports", CodometerTargetsModule) as
      | undefined
      | unknown[];
    const providers = Reflect.getMetadata(
      "providers",
      CodometerTargetsModule,
    ) as undefined | unknown[];

    expect(imports).toContain(LoggerModule);
    expect(providers).toContain(CodometerTargetsCommand);
    expect(providers).toContain(CodometerTargetsService);
  });
});
