import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { LoggerService } from "./logger.service";

type LoggerMethod = ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

type LoggerServiceConstructor = new () => {
  log: (message: unknown, context?: string) => void;
  setContext: (context: string) => void;
};

const originalNodeEnvironment: string | undefined = process.env["NODE_ENV"];
const originalLogLevel: string | undefined = process.env["LOG_LEVEL"];

const importLoggerService = async (
  nodeEnvironment: string | undefined,
  logLevel: string | undefined,
): Promise<LoggerServiceConstructor> => {
  if (nodeEnvironment === undefined) {
    delete process.env["NODE_ENV"];
  } else {
    process.env["NODE_ENV"] = nodeEnvironment;
  }

  if (logLevel === undefined) {
    delete process.env["LOG_LEVEL"];
  } else {
    process.env["LOG_LEVEL"] = logLevel;
  }

  vi.resetModules();
  const loggerModule = await import("./logger.service");

  return loggerModule.LoggerService;
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
    if (originalNodeEnvironment === undefined) {
      delete process.env["NODE_ENV"];
    } else {
      process.env["NODE_ENV"] = originalNodeEnvironment;
    }

    if (originalLogLevel === undefined) {
      delete process.env["LOG_LEVEL"];
    } else {
      process.env["LOG_LEVEL"] = originalLogLevel;
    }

    vi.resetModules();
  });

  interface LoggerChild {
    debug: LoggerMethod;
    error: LoggerMethod;
    info: LoggerMethod;
    trace: LoggerMethod;
    warn: LoggerMethod;
  }

  interface LoggerRoot {
    child: (bindings: { context: string }) => LoggerChild;
  }

  function createLoggerChild(): LoggerChild {
    return {
      debug: vi.fn<(...args: unknown[]) => void>(),
      error: vi.fn<(...args: unknown[]) => void>(),
      info: vi.fn<(...args: unknown[]) => void>(),
      trace: vi.fn<(...args: unknown[]) => void>(),
      warn: vi.fn<(...args: unknown[]) => void>(),
    };
  }

  it("is defined", () => {
    const command = service;

    expect(command).toBeDefined();
  });

  it("logs through all severity methods and stringifies non-string values", () => {
    const service = new LoggerService();
    const child = createLoggerChild();
    Object.assign(service, { child, context: "ServiceContext" });

    service.debug({ message: "debug" });
    service.debug({ message: "debug-explicit" }, "DebugContext");
    service.log(123, "ExplicitContext");
    service.warn("warning");
    service.warn("warning-explicit", "WarnContext");
    service.verbose("verbose");
    service.verbose("verbose-explicit", "VerboseContext");
    service.error(new Error("boom"), "stack trace");

    expect(child.debug).toHaveBeenNthCalledWith(
      1,
      { context: "ServiceContext" },
      "[object Object]",
    );
    expect(child.debug).toHaveBeenNthCalledWith(
      2,
      { context: "DebugContext" },
      "[object Object]",
    );
    expect(child.info).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "123",
    );
    expect(child.warn).toHaveBeenNthCalledWith(
      1,
      { context: "ServiceContext" },
      "warning",
    );
    expect(child.warn).toHaveBeenNthCalledWith(
      2,
      { context: "WarnContext" },
      "warning-explicit",
    );
    expect(child.trace).toHaveBeenNthCalledWith(
      1,
      { context: "ServiceContext" },
      "verbose",
    );
    expect(child.trace).toHaveBeenNthCalledWith(
      2,
      { context: "VerboseContext" },
      "verbose-explicit",
    );
    expect(child.error).toHaveBeenCalledWith(
      { context: "ServiceContext", stack: "stack trace" },
      "Error: boom",
    );
  });

  it("updates child logger when context changes", () => {
    const service = new LoggerService();
    const nextChild = createLoggerChild();
    const rootChild = vi
      .fn<(...args: unknown[]) => LoggerChild>()
      .mockReturnValue(nextChild);
    const originalRoot = Reflect.get(LoggerService, "root") as
      | LoggerRoot
      | undefined;
    Reflect.set(LoggerService, "root", { child: rootChild });

    try {
      service.setContext("UpdatedContext");
      service.log("message");

      expect(rootChild).toHaveBeenCalledWith({ context: "UpdatedContext" });
      expect(nextChild.info).toHaveBeenCalledWith(
        { context: "UpdatedContext" },
        "message",
      );
    } finally {
      Reflect.set(LoggerService, "root", originalRoot);
    }
  });

  it("initializes logger in production mode with explicit log level", async () => {
    const RuntimeLoggerService = await importLoggerService(
      "production",
      "debug",
    );
    const service = new RuntimeLoggerService();

    expect(() => {
      service.setContext("ProductionLoggerContext");
      service.log("production message");
    }).not.toThrow();
  });

  it("initializes logger in production mode with default log level", async () => {
    const RuntimeLoggerService = await importLoggerService(
      "production",
      undefined,
    );
    const service = new RuntimeLoggerService();

    expect(() => {
      service.setContext("ProductionDefaultLoggerContext");
      service.log("production default message");
    }).not.toThrow();
  });

  it("initializes logger in development mode", async () => {
    const RuntimeLoggerService = await importLoggerService(
      undefined,
      undefined,
    );
    const service = new RuntimeLoggerService();

    expect(() => {
      service.setContext("DevelopmentLoggerContext");
      service.log("development message");
    }).not.toThrow();
  });
});
