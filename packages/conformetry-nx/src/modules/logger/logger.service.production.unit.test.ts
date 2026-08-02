import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockChildLogger {
  debug: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  trace: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
}

function createMockChildLogger(): MockChildLogger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    trace: vi.fn(),
    warn: vi.fn(),
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
      child: vi.fn().mockReturnValue(childLogger),
    };
    const pinoFactory = vi.fn().mockReturnValue(rootLogger);

    vi.doMock("pino", () => {
      return {
        default: pinoFactory,
      };
    });

    const { LoggerService } = await import("./logger.service.js");
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
