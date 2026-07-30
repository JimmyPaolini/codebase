import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ArchiveLogsShellService } from "./archive-logs-shell.service";

describe(ArchiveLogsShellService, () => {
  let service: ArchiveLogsShellService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ArchiveLogsShellService],
    }).compile();

    service = await module.resolve(ArchiveLogsShellService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
