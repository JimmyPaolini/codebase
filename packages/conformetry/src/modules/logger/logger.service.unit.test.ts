import { describe, expect, it, vi } from "vitest";

import { LoggerService } from "./logger.service";

type LoggerMethod = ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;

describe(LoggerService, () => {
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
    const service = new LoggerService();

    expect(service).toBeDefined();
  });

  it("logs through all severity methods and stringifies non-string values", () => {
    const service = new LoggerService();
    const child = createLoggerChild();
    Object.assign(service, { child, context: "ServiceContext" });

    service.debug({ message: "debug" });
    service.log(123, "ExplicitContext");
    service.warn("warning");
    service.verbose("verbose");
    service.error(new Error("boom"), "stack trace");

    expect(child.debug).toHaveBeenCalledWith(
      { context: "ServiceContext" },
      "[object Object]",
    );
    expect(child.info).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "123",
    );
    expect(child.warn).toHaveBeenCalledWith(
      { context: "ServiceContext" },
      "warning",
    );
    expect(child.trace).toHaveBeenCalledWith(
      { context: "ServiceContext" },
      "verbose",
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
});
