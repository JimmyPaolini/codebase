import { describe, expect, it, vi } from "vitest";

import { LoggerService } from "./logger.service";

describe(LoggerService, () => {
  interface LoggerChild {
    debug: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    trace: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
  }

  function createLoggerChild(): LoggerChild {
    return {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      trace: vi.fn(),
      warn: vi.fn(),
    };
  }

  it("is defined", () => {
    const service = new LoggerService();

    expect(service).toBeDefined();
  });

  it("logs through all severity methods and stringifies non-string values", () => {
    const service = new LoggerService();
    const child = createLoggerChild();
    Reflect.set(service, "child", child);
    Reflect.set(service, "context", "ServiceContext");

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
    const rootChild = vi.fn().mockReturnValue(nextChild);
    Reflect.set(LoggerService, "root", { child: rootChild });

    service.setContext("UpdatedContext");
    service.log("message");

    expect(rootChild).toHaveBeenCalledWith({ context: "UpdatedContext" });
    expect(nextChild.info).toHaveBeenCalledWith(
      { context: "UpdatedContext" },
      "message",
    );
  });
});
