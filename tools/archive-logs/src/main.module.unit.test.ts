import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { MainModule } from "./main.module";
import { ArchiveLogsModule } from "./modules/archive-logs/archive-logs.module";

describe(MainModule, () => {
  it("compiles the application module without errors", async () => {
    const module = await Test.createTestingModule({
      imports: [ArchiveLogsModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
