import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "../logger/logger.service";
import { WriteReadmeService } from "../write-readme/write-readme.service";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";

describe(CodometerCommand, () => {
  let command: CodometerCommand;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CodometerService,
          useValue: createMock<CodometerService>(),
        },
        {
          provide: WriteReadmeService,
          useValue: createMock<WriteReadmeService>(),
        },
      ],
    }).compile();

    command = await module.resolve(CodometerCommand);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CodometerService,
          useValue: createMock<CodometerService>(),
        },
        {
          provide: WriteReadmeService,
          useValue: createMock<WriteReadmeService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CodometerCommand");
  });
});
