import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "./logger.service";

describe(LoggerService, () => {
  let service: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = await module.resolve(LoggerService);
  });

  it("is defined", () => {
        expect(command).toBeDefined();
  });
});
