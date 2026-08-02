import { describe, expect, it, vi } from "vitest";

const replMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@nestjs/core", async (importOriginal) => {
  const actualModule: Record<string, unknown> = await importOriginal();

  return {
    ...actualModule,
    repl: replMock,
  };
});

describe("repl bootstrap", () => {
  it("starts a NestJS repl for the main module", async () => {
    vi.resetModules();
    replMock.mockReset();

    const { MainModule } = await import("./main.module");
    await import("./repl.ts");

    await vi.waitFor(() => {
      expect(replMock).toHaveBeenCalledTimes(1);
    });

    expect(replMock).toHaveBeenCalledWith(MainModule);
  });
});
