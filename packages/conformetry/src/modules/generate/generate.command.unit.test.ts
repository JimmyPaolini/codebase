import { createMock } from "@golevelup/ts-vitest";
import {
  ConfigurationService,
  InputService,
} from "@jimmypaolini/conformetry-configuration";
import { GenerationService } from "@jimmypaolini/conformetry-generation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { GenerateCommand } from "./generate.command";

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(GenerateCommand, () => {
  let command: GenerateCommand;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenerateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: GenerationService,
          useValue: createMock<GenerationService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(GenerateCommand);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenerateCommand,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: GenerationService,
          useValue: createMock<GenerationService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("GenerateCommand");
  });
});
