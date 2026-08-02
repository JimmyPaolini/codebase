import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRepl } = vi.hoisted(() => {
  return {
    mockRepl: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@nestjs/core", async (importOriginal) => {
  const originalModule: Record<string, unknown> = await importOriginal();

  return {
    ...originalModule,
    repl: mockRepl,
  };
});

describe("repl bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    mockRepl.mockClear();
  });

  it("starts Nest REPL with the main module", async () => {
    await import("./repl");
    await Promise.resolve();

    expect(mockRepl).toHaveBeenCalledWith(expect.any(Function));
  });
});
