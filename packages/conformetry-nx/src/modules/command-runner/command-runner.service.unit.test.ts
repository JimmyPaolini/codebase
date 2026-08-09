import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CommandRunnerService } from "./command-runner.service";

describe(CommandRunnerService, () => {
  let service: CommandRunnerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CommandRunnerService],
    }).compile();

    service = await module.resolve(CommandRunnerService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
