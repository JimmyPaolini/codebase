import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DeleteLogsService } from "./delete-logs.service";

describe(DeleteLogsService, () => {
  let service: DeleteLogsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DeleteLogsService],
    }).compile();

    service = await module.resolve(DeleteLogsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
