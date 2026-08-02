import { afterEach, describe, expect, it, vi } from "vitest";

interface LoadedLoggerModule {
  LoggerService: new () => {
    debug: (message: unknown, context?: string) => void;
    error: (message: unknown, stackOrContext?: string) => void;
    log: (message: unknown, context?: string) => void;
    setContext: (context: string) => void;
    verbose: (message: unknown, context?: string) => void;
    warn: (message: unknown, context?: string) => void;
  };
}

interface LoadedLoggerServiceFixture {
  pinoMock: ReturnType<typeof vi.fn>;
  rootLogger: MockRootLogger;
  scopedLogger: MockChildLogger;
  service: {
    debug: (message: unknown, context?: string) => void;
    error: (message: unknown, stackOrContext?: string) => void;
    log: (message: unknown, context?: string) => void;
    setContext: (context: string) => void;
    verbose: (message: unknown, context?: string) => void;
    warn: (message: unknown, context?: string) => void;
  };
}

type LoggerMethodMock = ReturnType<typeof vi.fn>;

interface MockChildLogger {
  debug: LoggerMethodMock;
  error: LoggerMethodMock;
  info: LoggerMethodMock;
  trace: LoggerMethodMock;
  warn: LoggerMethodMock;
}

interface MockRootLogger extends MockChildLogger {
  child: ReturnType<typeof vi.fn>;
}

const createChildLogger = (): MockChildLogger => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  trace: vi.fn(),
  warn: vi.fn(),
});

const loadLoggerService = async (
  nodeEnvironment: "development" | "production",
  options?: {
    logLevel?: string | undefined;
  },
): Promise<LoadedLoggerServiceFixture> => {
  vi.resetModules();
  vi.doUnmock("./logger.service");

  process.env["NODE_ENV"] = nodeEnvironment;
  if (options?.logLevel === undefined) {
    delete process.env["LOG_LEVEL"];
  } else {
    process.env["LOG_LEVEL"] = options.logLevel;
  }

  const scopedLogger = createChildLogger();
  const rootLogger: MockRootLogger = {
    ...createChildLogger(),
    child: vi.fn().mockReturnValue(scopedLogger),
  };
  const pinoMock = vi.fn().mockReturnValue(rootLogger);

  vi.doMock("pino", () => ({
    default: pinoMock,
  }));

  const loadedModule = (await import("./logger.service")) as LoadedLoggerModule;
  const service = new loadedModule.LoggerService();

  return {
    pinoMock,
    rootLogger,
    scopedLogger,
    service,
  };
};

describe("loggerService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    delete process.env["LOG_LEVEL"];
    process.env["NODE_ENV"] = "test";
  });

  it("configures pino-pretty transport in development", async () => {
    const { pinoMock } = await loadLoggerService("development", {
      logLevel: "debug",
    });

    expect(pinoMock).toHaveBeenCalledWith({
      level: "debug",
      transport: {
        options: { colorize: true, singleLine: true },
        target: "pino-pretty",
      },
    });
  });

  it("uses the production pino configuration without pretty transport", async () => {
    const { pinoMock } = await loadLoggerService("production", {
      logLevel: "debug",
    });

    expect(pinoMock).toHaveBeenCalledWith({
      level: "debug",
    });
  });

  it("defaults to info log level when LOG_LEVEL is not defined", async () => {
    const { pinoMock } = await loadLoggerService("production");

    expect(pinoMock).toHaveBeenCalledWith({
      level: "info",
    });
  });

  it("logs with scoped context after setContext", async () => {
    const { rootLogger, scopedLogger, service } =
      await loadLoggerService("development");

    service.setContext("ValidatorService");
    service.debug("debug message");
    service.log("info message");
    service.verbose("trace message");
    service.warn("warn message");
    service.error("error message", "stack trace");

    expect(rootLogger.child).toHaveBeenCalledWith({
      context: "ValidatorService",
    });
    expect(scopedLogger.debug).toHaveBeenCalledWith(
      { context: "ValidatorService" },
      "debug message",
    );
    expect(scopedLogger.info).toHaveBeenCalledWith(
      { context: "ValidatorService" },
      "info message",
    );
    expect(scopedLogger.trace).toHaveBeenCalledWith(
      { context: "ValidatorService" },
      "trace message",
    );
    expect(scopedLogger.warn).toHaveBeenCalledWith(
      { context: "ValidatorService" },
      "warn message",
    );
    expect(scopedLogger.error).toHaveBeenCalledWith(
      { context: "ValidatorService", stack: "stack trace" },
      "error message",
    );
  });

  it("allows explicit context overrides and stringifies non-string messages", async () => {
    const { rootLogger, scopedLogger, service } =
      await loadLoggerService("development");

    service.setContext("DefaultContext");
    service.debug({ id: 1 }, "ExplicitDebugContext");
    service.log({ id: 2 }, "ExplicitInfoContext");
    service.verbose({ id: 3 }, "ExplicitTraceContext");
    service.warn({ id: 4 }, "ExplicitWarnContext");
    service.error({ id: 5 });

    expect(rootLogger.child).toHaveBeenCalledWith({
      context: "DefaultContext",
    });
    expect(scopedLogger.debug).toHaveBeenCalledWith(
      { context: "ExplicitDebugContext" },
      "[object Object]",
    );
    expect(scopedLogger.info).toHaveBeenCalledWith(
      { context: "ExplicitInfoContext" },
      "[object Object]",
    );
    expect(scopedLogger.trace).toHaveBeenCalledWith(
      { context: "ExplicitTraceContext" },
      "[object Object]",
    );
    expect(scopedLogger.warn).toHaveBeenCalledWith(
      { context: "ExplicitWarnContext" },
      "[object Object]",
    );
    expect(scopedLogger.error).toHaveBeenCalledWith(
      { context: "DefaultContext", stack: undefined },
      "[object Object]",
    );
  });
});
