import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "./logger.service";

type LoggerServiceConstructor = new () => {
  debug: (message: unknown, context?: string) => void;
  error: (message: unknown, stackOrContext?: string) => void;
  log: (message: unknown, context?: string) => void;
  setContext: (context: string) => void;
  verbose: (message: unknown, context?: string) => void;
  warn: (message: unknown, context?: string) => void;
};

const originalNodeEnvironment: string | undefined = process.env["NODE_ENV"];

const importLoggerService = async (
  nodeEnvironment: string | undefined,
): Promise<LoggerServiceConstructor> => {
  if (nodeEnvironment === undefined) {
    delete process.env["NODE_ENV"];
  } else {
    process.env["NODE_ENV"] = nodeEnvironment;
  }

  vi.resetModules();
  const loggerModule = await import("./logger.service");
  return loggerModule.LoggerService;
};

const runLoggingLevelAssertions = (
  service: InstanceType<LoggerServiceConstructor>,
): void => {
  expect(() => {
    service.setContext("LoggerServiceUnitTest");
    service.debug("debug-message");
    service.debug("debug-message", "custom-context");
    service.log("info-message");
    service.log("info-message", "custom-context");
    service.warn("warn-message");
    service.warn("warn-message", "custom-context");
    service.verbose("verbose-message");
    service.verbose("verbose-message", "custom-context");
    service.error("error-message");
    service.error("error-message", "stack-trace");
  }).not.toThrow();
};

describe(LoggerService, () => {
  let service: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = await module.resolve(LoggerService);
  });

  afterAll(() => {
    process.env["NODE_ENV"] = originalNodeEnvironment;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("is defined when loaded in development mode", async () => {
    const LoggerService = await importLoggerService(undefined);
    const service = new LoggerService();

    expect(service).toBeDefined();
  });

  it("logs using all supported levels in development mode", async () => {
    expect.hasAssertions();

    const LoggerService = await importLoggerService(undefined);
    const service = new LoggerService();

    runLoggingLevelAssertions(service);
  });

  it("logs using all supported levels in production mode", async () => {
    expect.hasAssertions();

    const LoggerService = await importLoggerService("production");
    const service = new LoggerService();

    runLoggingLevelAssertions(service);
  });
});
