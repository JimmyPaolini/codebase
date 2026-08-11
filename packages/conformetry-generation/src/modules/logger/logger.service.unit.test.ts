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
  const previousLogLevel = process.env["LOG_LEVEL"];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env["NODE_ENV"] = previousNodeEnvironment;
    process.env["LOG_LEVEL"] = previousLogLevel;
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
    service.log("message");

    expect(pinoFactory).toHaveBeenCalledTimes(1);
    expect(pinoFactory).toHaveBeenCalledWith({ level: "info" });
    expect(rootLogger.child).toHaveBeenCalledWith({
      context: "ProductionContext",
    });
    expect(childLogger.info).toHaveBeenCalledWith(
      { context: "ProductionContext" },
      "message",
    );
  });

  it("creates the root logger with pretty transport in development and routes all log levels", async () => {
    process.env["NODE_ENV"] = "development";
    process.env["LOG_LEVEL"] = "debug";
    const childLogger = createMockChildLogger();
    const rootLogger = {
      child: vi
        .fn<(obj: Record<string, string>) => MockChildLogger>()
        .mockReturnValue(childLogger),
    };
    const pinoFactory = vi
      .fn<(obj: Record<string, unknown>) => typeof rootLogger>()
      .mockReturnValue(rootLogger);

    vi.doMock("pino", () => {
      return {
        default: pinoFactory,
      };
    });

    const { LoggerService } = await import("./logger.service");
    const service = new LoggerService();

    service.setContext("DevelopmentContext");
    service.log("log message");
    service.debug("debug message");
    service.verbose("verbose message");
    service.warn("warn message");
    service.error("error message", "stack trace");
    service.debug("explicit context message", "ExplicitContext");

    expect(pinoFactory).toHaveBeenCalledTimes(1);
    expect(pinoFactory).toHaveBeenCalledWith({
      level: "debug",
      transport: {
        options: { colorize: true, singleLine: true },
        target: "pino-pretty",
      },
    });
    expect(rootLogger.child).toHaveBeenCalledWith({
      context: "DevelopmentContext",
    });
    expect(childLogger.info).toHaveBeenCalledWith(
      { context: "DevelopmentContext" },
      "log message",
    );
    expect(childLogger.debug).toHaveBeenNthCalledWith(
      1,
      { context: "DevelopmentContext" },
      "debug message",
    );
    expect(childLogger.trace).toHaveBeenCalledWith(
      { context: "DevelopmentContext" },
      "verbose message",
    );
    expect(childLogger.warn).toHaveBeenCalledWith(
      { context: "DevelopmentContext" },
      "warn message",
    );
    expect(childLogger.error).toHaveBeenCalledWith(
      { context: "DevelopmentContext", stack: "stack trace" },
      "error message",
    );
    expect(childLogger.debug).toHaveBeenNthCalledWith(
      2,
      { context: "ExplicitContext" },
      "explicit context message",
    );
  });
});
