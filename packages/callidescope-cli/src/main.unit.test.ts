import { beforeEach, describe, expect, it, vi } from "vitest";

interface CommandFactoryRunOptions {
  logger: { error: (message: unknown) => void };
}

const mockLoggerError =
  vi.fn<(message: unknown, context: undefined, data: unknown) => void>();
const mockLoggerSetContext = vi.fn<(context: string) => void>();
const mockCommandFactoryRun = vi.fn<
  (_module: unknown, _options: CommandFactoryRunOptions) => Promise<void>
>(async () => {});

// `main.ts` only reaches NestJS through `@codebase/logger`, so the logger
// package is the mock boundary — the real `LoggerService` is covered by its
// own package's tests.
vi.mock("@codebase/logger", () => {
  class MockLoggerService {
    error(message: unknown, context: undefined, data: unknown): void {
      mockLoggerError(message, context, data);
    }

    setContext(context: string): void {
      mockLoggerSetContext(context);
    }
  }

  return {
    LoggerService: MockLoggerService,
  };
});

vi.mock("nest-commander", () => {
  return {
    CommandFactory: {
      run: mockCommandFactoryRun,
    },
  };
});

vi.mock("./main.module.js", () => {
  function MockMainModule(): void {}

  return {
    MainModule: MockMainModule,
  };
});

async function importMainModule(): Promise<void> {
  await import("./main.js");
}

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLoggerError.mockClear();
    mockLoggerSetContext.mockClear();
    mockCommandFactoryRun.mockReset().mockResolvedValue(undefined);
    process.exitCode = undefined;
  });

  it("bootstraps the command factory and sets the logger context", async () => {
    await importMainModule();

    await vi.waitFor(() => {
      expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
    });

    expect(mockLoggerSetContext).toHaveBeenCalledWith("CommandFactory");
  });

  it("logs and marks the process failed when bootstrapping crashes", async () => {
    mockCommandFactoryRun.mockRejectedValueOnce(new Error("boom"));

    await importMainModule();

    await vi.waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledTimes(1);
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      "🔥 Crashed before completing",
      undefined,
      { reason: "boom" },
    );
    expect(process.exitCode).toBe(1);
  });

  it("normalizes a non-error crash reason to its string form", async () => {
    mockCommandFactoryRun.mockRejectedValueOnce("boom");

    await importMainModule();

    await vi.waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledTimes(1);
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      "🔥 Crashed before completing",
      undefined,
      { reason: "boom" },
    );
  });
});
