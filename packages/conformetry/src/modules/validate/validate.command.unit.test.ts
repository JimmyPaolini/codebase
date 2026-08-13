import { createMock } from "@golevelup/ts-vitest";
import {
  ConfigurationService,
  DiscoveryService,
  InputService,
} from "@jimmypaolini/conformetry-configuration";
import { ReportingService } from "@jimmypaolini/conformetry-core";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { ValidateCommand } from "./validate.command";

import type { TestingModule } from "@nestjs/testing";

/** Compiles the command with every dependency mocked. */
async function createModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      ValidateCommand,
      {
        provide: ConfigurationService,
        useValue: createMock<ConfigurationService>(),
      },
      { provide: DiscoveryService, useValue: createMock<DiscoveryService>() },
      { provide: InputService, useValue: createMock<InputService>() },
      { provide: LoggerService, useValue: createMock<LoggerService>() },
      { provide: ReportingService, useValue: createMock<ReportingService>() },
      { provide: ValidationService, useValue: createMock<ValidationService>() },
    ],
  }).compile();
}

/**
 * Dependencies are mocked here; that the real graph wires is proven by
 * `main.integration.test.ts`, which compiles the whole application.
 */
describe(ValidateCommand, () => {
  let command: ValidateCommand;

  beforeAll(async () => {
    const module = await createModule();

    command = await module.resolve(ValidateCommand);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await createModule();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ValidateCommand");
  });
});
