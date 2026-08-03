import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "./logger.service";

describe(LoggerService, () => {
  let service: LoggerService;
  const debugMock = vi.fn();
  const errorMock = vi.fn();
  const infoMock = vi.fn();
  const traceMock = vi.fn();
  const warnMock = vi.fn();
  const childFactoryMock = vi.fn(() => ({
    debug: debugMock,
    error: errorMock,
    info: infoMock,
    trace: traceMock,
    warn: warnMock,
  }));

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    debugMock.mockReset();
    errorMock.mockReset();
    infoMock.mockReset();
    traceMock.mockReset();
    warnMock.mockReset();
    childFactoryMock.mockClear();
    Reflect.set(Reflect.get(service, "constructor"), "root", {
      child: childFactoryMock,
      debug: debugMock,
      error: errorMock,
      info: infoMock,
      trace: traceMock,
      warn: warnMock,
    });
    Reflect.set(service, "child", {
      debug: debugMock,
      error: errorMock,
      info: infoMock,
      trace: traceMock,
      warn: warnMock,
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("writes all log levels with context", () => {
    service.setContext("LoggerServiceUnitTest");

    service.debug("debug-message");
    service.log("info-message");
    service.verbose("verbose-message");
    service.warn("warn-message");
    service.error("error-message", "stack-trace");

    expect(childFactoryMock).toHaveBeenCalledWith({
      context: "LoggerServiceUnitTest",
    });
    expect(debugMock).toHaveBeenCalledWith(
      { context: "LoggerServiceUnitTest" },
      "debug-message",
    );
    expect(infoMock).toHaveBeenCalledWith(
      { context: "LoggerServiceUnitTest" },
      "info-message",
    );
    expect(traceMock).toHaveBeenCalledWith(
      { context: "LoggerServiceUnitTest" },
      "verbose-message",
    );
    expect(warnMock).toHaveBeenCalledWith(
      { context: "LoggerServiceUnitTest" },
      "warn-message",
    );
    expect(errorMock).toHaveBeenCalledWith(
      { context: "LoggerServiceUnitTest", stack: "stack-trace" },
      "error-message",
    );
  });

  it("prefers explicit context when provided to log methods", () => {
    service.setContext("DefaultContext");
    service.debug("debug-message", "ExplicitContext");
    service.log("info-message", "ExplicitContext");
    service.verbose("verbose-message", "ExplicitContext");
    service.warn("warn-message", "ExplicitContext");

    expect(debugMock).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "debug-message",
    );
    expect(infoMock).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "info-message",
    );
    expect(traceMock).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "verbose-message",
    );
    expect(warnMock).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "warn-message",
    );
  });
});
