import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreate } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn(),
  };
});

vi.mock("@nestjs/core", async (importOriginal) => {
  const originalModule = (await importOriginal()) as Record<string, unknown>;

  return {
    ...originalModule,
    NestFactory: {
      create: mockCreate,
    },
  };
});

describe("main bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreate.mockReset();
  });

  it("creates the application and initializes the configured logger", async () => {
    const logger = { log: vi.fn() };
    const application = {
      get: vi.fn().mockReturnValue(logger),
      init: vi.fn().mockResolvedValue(undefined),
      useLogger: vi.fn(),
    };
    mockCreate.mockResolvedValue(application);

    await import("./main");
    await Promise.resolve();

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Function), {
      bufferLogs: true,
    });
    expect(application.get).toHaveBeenCalledWith(expect.any(Function));
    expect(application.useLogger).toHaveBeenCalledWith(logger);
    expect(application.init).toHaveBeenCalledTimes(1);
  });
});
