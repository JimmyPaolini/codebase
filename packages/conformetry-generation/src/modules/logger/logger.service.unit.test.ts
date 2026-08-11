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
