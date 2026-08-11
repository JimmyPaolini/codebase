import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockChildLogger {
  debug: ReturnType<typeof vi.fn<() => void>>;
  error: ReturnType<typeof vi.fn<() => void>>;
  info: ReturnType<typeof vi.fn<() => void>>;
  trace: ReturnType<typeof vi.fn<() => void>>;
  warn: ReturnType<typeof vi.fn<() => void>>;
}

function createMockChildLogger(): MockChildLogger {
  return {
    debug: vi.fn<() => void>(),
    error: vi.fn<() => void>(),
    info: vi.fn<() => void>(),
    trace: vi.fn<() => void>(),
    warn: vi.fn<() => void>(),
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
      child: vi.fn<(bindings: { context: string }) => MockChildLogger>(),
    };
    const pinoFactory = vi.fn<() => typeof rootLogger>();

    rootLogger.child.mockReturnValue(childLogger);
    pinoFactory.mockReturnValue(rootLogger);

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
});
