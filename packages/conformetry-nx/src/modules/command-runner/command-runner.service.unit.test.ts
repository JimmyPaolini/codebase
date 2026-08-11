import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { COMMAND_RUNNER_SERVICE_NAME } from "./command-runner.constants.js";
import { CommandRunnerService } from "./command-runner.service.js";

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

  it("returns the command runner service name", () => {
    expect(service.getCommandRunnerName()).toBe(COMMAND_RUNNER_SERVICE_NAME);
  });
});
