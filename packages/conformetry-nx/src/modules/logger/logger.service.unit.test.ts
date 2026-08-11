import { beforeEach, describe, expect, it, vi } from "vitest";

interface PinoLoggerDouble {
  child: ReturnType<
    typeof vi.fn<(bindings: { context: string }) => PinoLoggerDouble>
  >;
  debug: ReturnType<
    typeof vi.fn<(bindings: { context?: string }, message: string) => void>
  >;
  error: ReturnType<
    typeof vi.fn<
      (bindings: { context?: string; stack?: string }, message: string) => void
    >
  >;
  info: ReturnType<
    typeof vi.fn<(bindings: { context?: string }, message: string) => void>
  >;
  trace: ReturnType<
    typeof vi.fn<(bindings: { context?: string }, message: string) => void>
  >;
  warn: ReturnType<
    typeof vi.fn<(bindings: { context?: string }, message: string) => void>
  >;
}

const { mockPino, rootLogger, scopedLogger } = vi.hoisted(() => {
  function createLoggerDouble(): PinoLoggerDouble {
    const loggerDouble: PinoLoggerDouble = {
      child: vi.fn<(bindings: { context: string }) => PinoLoggerDouble>(),
      debug: vi.fn<(bindings: { context?: string }, message: string) => void>(),
      error:
        vi.fn<
          (
            bindings: { context?: string; stack?: string },
            message: string,
          ) => void
        >(),
      info: vi.fn<(bindings: { context?: string }, message: string) => void>(),
      trace: vi.fn<(bindings: { context?: string }, message: string) => void>(),
      warn: vi.fn<(bindings: { context?: string }, message: string) => void>(),
    };

    return loggerDouble;
  }

  const scoped = createLoggerDouble();
  const root = createLoggerDouble();
  root.child.mockReturnValue(scoped);
  scoped.child.mockReturnValue(scoped);

  return {
    mockPino: vi.fn<() => typeof root>(() => {
      return root;
    }),
    rootLogger: root,
    scopedLogger: scoped,
  };
});

vi.mock("pino", () => {
  return {
    default: mockPino,
  };
});

import { LoggerService } from "./logger.service.js";

describe(LoggerService, () => {
  beforeEach(() => {
    rootLogger.child.mockClear();
    rootLogger.debug.mockClear();
    rootLogger.error.mockClear();
    rootLogger.info.mockClear();
    rootLogger.trace.mockClear();
    rootLogger.warn.mockClear();

    scopedLogger.child.mockClear();
    scopedLogger.debug.mockClear();
    scopedLogger.error.mockClear();
    scopedLogger.info.mockClear();
    scopedLogger.trace.mockClear();
    scopedLogger.warn.mockClear();
  });

  it("is defined", () => {
    const service = new LoggerService();

    expect(service).toBeDefined();
  });

  it("logs through all severity methods and stringifies non-string values", () => {
    const service = new LoggerService();

    service.setContext("ServiceContext");
    service.debug({ message: "debug" });
    service.log(123, "ExplicitContext");
    service.warn("warning");
    service.verbose("verbose");
    service.error(new Error("boom"), "stack trace");

    expect(scopedLogger.debug).toHaveBeenCalledWith(
      { context: "ServiceContext" },
      "[object Object]",
    );
    expect(scopedLogger.info).toHaveBeenCalledWith(
      { context: "ExplicitContext" },
      "123",
    );
    expect(scopedLogger.warn).toHaveBeenCalledWith(
      { context: "ServiceContext" },
      "warning",
    );
    expect(scopedLogger.trace).toHaveBeenCalledWith(
      { context: "ServiceContext" },
      "verbose",
    );
    expect(scopedLogger.error).toHaveBeenCalledWith(
      { context: "ServiceContext", stack: "stack trace" },
      "Error: boom",
    );
  });

  it("updates child logger when context changes", () => {
    const service = new LoggerService();

    service.setContext("UpdatedContext");
    service.log("message");

    expect(rootLogger.child).toHaveBeenCalledWith({
      context: "UpdatedContext",
    });
    expect(scopedLogger.info).toHaveBeenCalledWith(
      { context: "UpdatedContext" },
      "message",
    );
  });
});
