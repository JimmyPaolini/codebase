import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "./logger.service";

describe(LoggerService, () => {
  let service: LoggerService;
  let childLogger: {
    debug: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    trace: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  };

  let rootLogger: {
    child: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    childLogger = {
      debug:
        vi.fn<(bindings: Record<string, unknown>, message: string) => void>(),
      error:
        vi.fn<(bindings: Record<string, unknown>, message: string) => void>(),
      info: vi.fn<
        (bindings: Record<string, unknown>, message: string) => void
      >(),
      trace:
        vi.fn<(bindings: Record<string, unknown>, message: string) => void>(),
      warn: vi.fn<
        (bindings: Record<string, unknown>, message: string) => void
      >(),
    };
    rootLogger = {
      child: vi
        .fn<(bindings: Record<string, unknown>) => typeof childLogger>()
        .mockReturnValue(childLogger),
    };

    Object.defineProperty(service, "child", {
      configurable: true,
      value: childLogger,
      writable: true,
    });
    Object.defineProperty(LoggerService, "root", {
      configurable: true,
      value: rootLogger,
      writable: true,
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("logs debug messages with resolved context", () => {
    service.setContext("LoggerServiceTest");
    service.debug("debug-message");

    expect(childLogger.debug).toHaveBeenCalledWith(
      { context: "LoggerServiceTest" },
      "debug-message",
    );
  });

  it("logs info messages with explicit context override", () => {
    service.log("info-message", "ExplicitContext");

    expect(childLogger.info).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "info-message",
    );
  });

  it("logs info messages with service context when no override is provided", () => {
    service.setContext("LoggerServiceTest");
    service.log("info-message");

    expect(childLogger.info).toHaveBeenCalledWith(
      { context: "LoggerServiceTest" },
      "info-message",
    );
  });

  it("logs error messages with stack context", () => {
    service.setContext("LoggerServiceTest");
    service.error("error-message", "stack-value");

    expect(childLogger.error).toHaveBeenCalledWith(
      { context: "LoggerServiceTest", stack: "stack-value" },
      "error-message",
    );
  });

  it("logs verbose messages at trace level", () => {
    service.verbose("verbose-message", "VerboseContext");

    expect(childLogger.trace).toHaveBeenCalledWith(
      { context: "VerboseContext" },
      "verbose-message",
    );
  });

  it("logs verbose messages with service context when no override is provided", () => {
    service.setContext("LoggerServiceTest");
    service.verbose("verbose-message");

    expect(childLogger.trace).toHaveBeenCalledWith(
      { context: "LoggerServiceTest" },
      "verbose-message",
    );
  });

  it("logs warning messages", () => {
    service.warn("warn-message", "WarnContext");

    expect(childLogger.warn).toHaveBeenCalledWith(
      { context: "WarnContext" },
      "warn-message",
    );
  });

  it("logs warning messages with service context when no override is provided", () => {
    service.setContext("LoggerServiceTest");
    service.warn("warn-message");

    expect(childLogger.warn).toHaveBeenCalledWith(
      { context: "LoggerServiceTest" },
      "warn-message",
    );
  });

  it("updates child logger when context changes", () => {
    service.setContext("ContextA");
    service.log("hello");

    expect(rootLogger.child).toHaveBeenCalledWith({ context: "ContextA" });
    expect(childLogger.info).toHaveBeenCalledWith(
      { context: "ContextA" },
      "hello",
    );
  });
});
