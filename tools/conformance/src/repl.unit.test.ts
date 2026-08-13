import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as NestCore from "@nestjs/core";

const { replMock } = vi.hoisted(() => ({
  replMock: vi
    .fn<(module: unknown) => Promise<void>>()
    .mockResolvedValue(undefined),
}));

vi.mock("@nestjs/core", async (importOriginal) => {
  const actual = await importOriginal<typeof NestCore>();
  return {
    ...actual,
    repl: replMock,
  };
});

describe("repl bootstrap", () => {
  beforeEach(() => {
    replMock.mockClear();
    vi.resetModules();
  });

  it("starts Nest REPL with main module", async () => {
    await import("./repl");

    expect(replMock).toHaveBeenCalledTimes(1);
  }, 15_000);
});
