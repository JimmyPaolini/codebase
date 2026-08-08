import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLogger = {
  debug: vi.fn<(payload: unknown, message: string) => void>(),
  error: vi.fn<(payload: unknown, message: string) => void>(),
  info: vi.fn<(payload: unknown, message: string) => void>(),
  trace: vi.fn<(payload: unknown, message: string) => void>(),
  warn: vi.fn<(payload: unknown, message: string) => void>(),
};

const mockRootLogger = {
  child: vi.fn<(bindings: Record<string, string>) => typeof mockLogger>(() => {
    return mockLogger;
  }),
};

const mockPino = vi.fn<(options: unknown) => typeof mockRootLogger>(() => {
  return mockRootLogger;
});

vi.mock("pino", () => {
  return {
    default: mockPino,
  };
});

describe("loggerService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env["NODE_ENV"];
    delete process.env["LOG_LEVEL"];
  });

  it("is defined", async () => {
    const { LoggerService } = await import("./logger.service.js");
    const service = new LoggerService();

    expect(service).toBeDefined();
    expect(mockPino).toHaveBeenCalledTimes(1);
  });

  it("sets context and forwards log calls to pino child logger", async () => {
    const { LoggerService } = await import("./logger.service.js");
    const service = new LoggerService();

    service.setContext("GenerateCommand");
    service.log("generated file");
    service.debug("debug message");
    service.verbose("trace message");
    service.warn("warn message");
    service.error("error message", "stack-trace");

    expect(mockRootLogger.child).toHaveBeenCalledWith({
      context: "GenerateCommand",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      { context: "GenerateCommand" },
      "generated file",
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { context: "GenerateCommand" },
      "debug message",
    );
    expect(mockLogger.trace).toHaveBeenCalledWith(
      { context: "GenerateCommand" },
      "trace message",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { context: "GenerateCommand" },
      "warn message",
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      { context: "GenerateCommand", stack: "stack-trace" },
      "error message",
    );
  });

  it("uses call-specific context override when provided", async () => {
    const { LoggerService } = await import("./logger.service.js");
    const service = new LoggerService();

    service.setContext("DefaultContext");
    service.log("hello", "Override");
    service.debug("debug", "Override");
    service.verbose("verbose", "Override");
    service.warn("warn", "Override");

    expect(mockLogger.info).toHaveBeenCalledWith(
      { context: "Override" },
      "hello",
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      { context: "Override" },
      "debug",
    );
    expect(mockLogger.trace).toHaveBeenCalledWith(
      { context: "Override" },
      "verbose",
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { context: "Override" },
      "warn",
    );
  });

  it("initializes pino without pretty transport in production", async () => {
    process.env["NODE_ENV"] = "production";
    process.env["LOG_LEVEL"] = "debug";

    const { LoggerService } = await import("./logger.service.js");
    const service = new LoggerService();

    expect(service).toBeDefined();
    expect(mockPino).toHaveBeenCalledWith({ level: "debug" });
  });

  it("uses default production log level when LOG_LEVEL is not defined", async () => {
    process.env["NODE_ENV"] = "production";

    const { LoggerService } = await import("./logger.service.js");
    const service = new LoggerService();

    expect(service).toBeDefined();
    expect(mockPino).toHaveBeenCalledWith({ level: "info" });
  });
});
