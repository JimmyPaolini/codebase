import { beforeEach, describe, expect, it, vi } from "vitest";

type CommandFactoryRun = (
  module: unknown,
  options: { bufferLogs: boolean; logger: unknown },
) => Promise<void>;

const run = vi.fn<CommandFactoryRun>().mockResolvedValue(undefined);
const setContext = vi.fn<(context: string) => void>();

vi.mock("nest-commander", () => ({
  CommandFactory: {
    run,
  },
}));

vi.mock("./modules/logger/logger.service", () => ({
  LoggerService: class {
    setContext = setContext;
  },
}));

vi.mock("./main.module", () => ({
  MainModule: class {
    readonly moduleName = "MainModuleMock";
  },
}));

describe("main bootstrap", () => {
  beforeEach(() => {
    run.mockClear();
    setContext.mockClear();
    vi.resetModules();
  });

  it("runs the command factory with a configured logger", async () => {
    await import("./main");

    expect(setContext).toHaveBeenCalledWith("CommandFactory");
    expect(run).toHaveBeenCalledTimes(1);

    const firstCall = run.mock.calls[0];

    expect(firstCall).toBeDefined();
    expect(firstCall?.[1]).toStrictEqual(
      expect.objectContaining({ bufferLogs: true }),
    );
  });
});
