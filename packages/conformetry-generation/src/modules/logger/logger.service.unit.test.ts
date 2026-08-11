import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockChildLogger {
  debug: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
  error: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
  info: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
  trace: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
  warn: ReturnType<typeof vi.fn<(...args: unknown[]) => void>>;
}

function createMockChildLogger(): MockChildLogger {
  return {
    debug: vi.fn<(...args: unknown[]) => void>(),
    error: vi.fn<(...args: unknown[]) => void>(),
    info: vi.fn<(...args: unknown[]) => void>(),
    trace: vi.fn<(...args: unknown[]) => void>(),
    warn: vi.fn<(...args: unknown[]) => void>(),
  };
}

describe("loggerService production mode", () => {
  const previousNodeEnvironment = process.env["NODE_ENV"];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env["NODE_ENV"] = previousNodeEnvironment;
    vi.doUnmock("pino");
  });

  it("creates the root logger without pretty transport in production", async () => {
    process.env["NODE_ENV"] = "production";
    const childLogger = createMockChildLogger();
    const rootLogger = {
      child: vi
        .fn<(obj: Record<string, string>) => MockChildLogger>()
        .mockReturnValue(childLogger),
    };
    const pinoFactory = vi
      .fn<(obj: Record<string, string>) => typeof rootLogger>()
      .mockReturnValue(rootLogger);

    vi.doMock("pino", () => {
      return {
        default: pinoFactory,
      };
    });

    const { LoggerService } = await import("./logger.service");
    const service = new LoggerService();

    service.setContext("ProductionContext");
    service.debug("debug message");
    service.debug("debug message explicit", "ExplicitContext");
    service.log("message");
    service.log("message explicit", "ExplicitContext");
    service.verbose("verbose message");
    service.verbose("verbose message explicit", "ExplicitContext");
    service.warn("warn message");
    service.warn("warn message explicit", "ExplicitContext");
    service.error("error message", "stack trace");

    expect(pinoFactory).toHaveBeenCalledTimes(1);
    expect(pinoFactory).toHaveBeenCalledWith({ level: "info" });
    expect(rootLogger.child).toHaveBeenCalledWith({
      context: "ProductionContext",
    });
    expect(childLogger.info).toHaveBeenCalledWith(
      { context: "ProductionContext" },
      "message",
    );
    expect(childLogger.debug).toHaveBeenNthCalledWith(
      1,
      { context: "ProductionContext" },
      "debug message",
    );
    expect(childLogger.debug).toHaveBeenNthCalledWith(
      2,
      { context: "ExplicitContext" },
      "debug message explicit",
    );
    expect(childLogger.info).toHaveBeenNthCalledWith(
      2,
      { context: "ExplicitContext" },
      "message explicit",
    );
    expect(childLogger.trace).toHaveBeenNthCalledWith(
      1,
      { context: "ProductionContext" },
      "verbose message",
    );
    expect(childLogger.trace).toHaveBeenNthCalledWith(
      2,
      { context: "ExplicitContext" },
      "verbose message explicit",
    );
    expect(childLogger.warn).toHaveBeenNthCalledWith(
      1,
      { context: "ProductionContext" },
      "warn message",
    );
    expect(childLogger.warn).toHaveBeenNthCalledWith(
      2,
      { context: "ExplicitContext" },
      "warn message explicit",
    );
    expect(childLogger.error).toHaveBeenCalledWith(
      { context: "ProductionContext", stack: "stack trace" },
      "error message",
    );
  });
});
