import { beforeEach, describe, expect, it, vi } from "vitest";

const repl = vi
  .fn<(module: unknown) => Promise<void>>()
  .mockResolvedValue(undefined);

vi.mock("@nestjs/core", () => ({
  repl,
}));

vi.mock("./main.module", () => ({
  MainModule: class {
    readonly moduleName = "MainModuleMock";
  },
}));

describe("repl bootstrap", () => {
  beforeEach(() => {
    repl.mockClear();
    vi.resetModules();
  });

  it("starts the nest repl for the main module", async () => {
    await import("./repl");

    expect(repl).toHaveBeenCalledTimes(1);
  });
});
