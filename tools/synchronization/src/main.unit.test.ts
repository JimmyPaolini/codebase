import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoggerService } from "./modules/logger/logger.service";
import type { SynchronizationModule } from "./modules/synchronization/synchronization.module";

type CommandFactoryRun = (
  module: unknown,
  options: { bufferLogs: boolean; logger: unknown },
) => Promise<void>;

const run = vi.fn<CommandFactoryRun>().mockResolvedValue(undefined);
const loggerServiceMock = createMock<LoggerService>();
const synchronizationModuleMock = createMock<SynchronizationModule>();

vi.mock("nest-commander", () => ({
  CommandFactory: {
    run,
  },
}));

vi.mock("./modules/logger/logger.service", () => ({
  LoggerService: function LoggerService() {
    return loggerServiceMock;
  },
}));

vi.mock("./modules/synchronization/synchronization.module", () => ({
  SynchronizationModule: function SynchronizationModule() {
    return synchronizationModuleMock;
  },
}));

describe("main bootstrap", () => {
  beforeEach(() => {
    run.mockClear();
    loggerServiceMock.setContext.mockClear();
    vi.resetModules();
  });

  it("runs the synchronization command factory with a configured logger", async () => {
    await import("./main");

    expect(loggerServiceMock.setContext).toHaveBeenCalledWith("CommandFactory");
    expect(run).toHaveBeenCalledTimes(1);

    const firstCall = run.mock.calls[0];

    expect(firstCall).toBeDefined();
    expect(firstCall?.[1]).toStrictEqual(
      expect.objectContaining({ bufferLogs: true }),
    );
  });
});
