import { describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@nestjs/core", async (importOriginal) => {
  const actualModule: Record<string, unknown> = await importOriginal();

  return {
    ...actualModule,
    NestFactory: {
      create: createMock,
    },
  };
});

describe("main bootstrap", () => {
  it("creates the app with buffered logs and initializes logger wiring", async () => {
    vi.resetModules();
    createMock.mockReset();

    const logger = { label: "logger" };
    const getMock = vi.fn().mockReturnValue(logger);
    const useLoggerMock = vi.fn();
    const initMock = vi.fn().mockResolvedValue(undefined);

    createMock.mockResolvedValue({
      get: getMock,
      init: initMock,
      useLogger: useLoggerMock,
    });

    const { LoggerService } = await import("./modules/logger/logger.service");
    await import("./main.ts");

    await vi.waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    expect(createMock).toHaveBeenCalledWith(expect.any(Function), {
      bufferLogs: true,
    });
    expect(getMock).toHaveBeenCalledWith(LoggerService);
    expect(useLoggerMock).toHaveBeenCalledWith(logger);
    expect(initMock).toHaveBeenCalledTimes(1);
  });
});
