import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { PublishSetCommand } from "./publish-set.command";
import { PublishSetModule } from "./publish-set.module";
import { PublishSetService } from "./publish-set.service";

describe(PublishSetModule, () => {
  it("compiles and exports providers", async () => {
    expect.hasAssertions();

    const moduleRef = await Test.createTestingModule({
      imports: [PublishSetModule],
    }).compile();

    expect(moduleRef.get(PublishSetCommand)).toBeInstanceOf(PublishSetCommand);
    expect(moduleRef.get(PublishSetService)).toBeInstanceOf(PublishSetService);
  });
});
