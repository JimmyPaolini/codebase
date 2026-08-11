import { beforeEach, describe, expect, it, vi } from "vitest";

const repl = vi
  .fn<(module: unknown) => Promise<void>>()
  .mockResolvedValue(undefined);

vi.mock("@nestjs/core", () => ({
  DiscoveryModule: class DiscoveryModule {},
  repl,
}));

vi.mock("./modules/synchronization/synchronization.module", () => ({
  SynchronizationModule: class {
    readonly moduleName = "SynchronizationModuleMock";
  },
}));

describe("repl bootstrap", () => {
  beforeEach(() => {
    repl.mockClear();
    vi.resetModules();
  });

  it("starts the nest repl for the synchronization module", async () => {
    await import("./repl");

    expect(repl).toHaveBeenCalledTimes(1);
  });
});
