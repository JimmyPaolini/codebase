import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CommandExecutionService } from "./command-execution.service";

describe(CommandExecutionService, () => {
  let service: CommandExecutionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CommandExecutionService],
    }).compile();

    service = await module.resolve(CommandExecutionService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
