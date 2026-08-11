import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface MockChildLogger {
  debug: ReturnType<
    typeof vi.fn<(metadata: { context: string }, message: string) => void>
  >;
  error: ReturnType<
    typeof vi.fn<(metadata: { context: string }, message: string) => void>
  >;
  info: ReturnType<
    typeof vi.fn<(metadata: { context: string }, message: string) => void>
  >;
  trace: ReturnType<
    typeof vi.fn<(metadata: { context: string }, message: string) => void>
  >;
  warn: ReturnType<
    typeof vi.fn<(metadata: { context: string }, message: string) => void>
  >;
}

function createMockChildLogger(): MockChildLogger {
  return {
    debug: vi.fn<(metadata: { context: string }, message: string) => void>(),
    error: vi.fn<(metadata: { context: string }, message: string) => void>(),
    info: vi.fn<(metadata: { context: string }, message: string) => void>(),
    trace: vi.fn<(metadata: { context: string }, message: string) => void>(),
    warn: vi.fn<(metadata: { context: string }, message: string) => void>(),
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
        .fn<(bindings: { context: string }) => MockChildLogger>()
        .mockReturnValue(childLogger),
    };
    const pinoFactory = vi
      .fn<(options: { level: string }) => typeof rootLogger>()
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
