import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCommandFactoryRun = vi.fn<() => Promise<void>>(async () => {
  
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

interface MainModuleExports {
  collectGeneratorPassthroughArguments: (rawArguments: string[]) => {
    passthroughArguments: string[];
    sanitizedArguments: string[];
  };
}

async function importMainModule(): Promise<MainModuleExports> {
  return import("./main.js");
}

describe("collectGeneratorPassthroughArguments", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCommandFactoryRun.mockClear();
    delete process.env["CONFORMETRY_GENERATOR_OPTIONS"];
    process.argv = ["node", "conformetry"];
  });

  it("forwards repeated generator-specific options after the initial selector options", async () => {
    const { collectGeneratorPassthroughArguments } = await importMainModule();
    const { passthroughArguments, sanitizedArguments } =
      collectGeneratorPassthroughArguments([
        "generate",
        "--config",
        "configuration/conformetry.config.ts",
        "--name",
        "react-component",
        "--name",
        "demo-component",
        "--project",
        "lexico-components",
      ]);

    expect(sanitizedArguments).toStrictEqual([
      "generate",
      "--config",
      "configuration/conformetry.config.ts",
      "--name",
      "react-component",
    ]);
    expect(passthroughArguments).toStrictEqual([
      "--name",
      "demo-component",
      "--project",
      "lexico-components",
    ]);
  });

  it("returns all arguments unchanged when generate subcommand is absent", async () => {
    const { collectGeneratorPassthroughArguments } = await importMainModule();
    const rawArguments = ["validate", "--config", "configuration/config.ts"];

    const result = collectGeneratorPassthroughArguments(rawArguments);

    expect(result).toStrictEqual({
      passthroughArguments: [],
      sanitizedArguments: rawArguments,
    });
  });

  it("collects non-reserved options and supports inline assignments", async () => {
    const { collectGeneratorPassthroughArguments } = await importMainModule();

    const result = collectGeneratorPassthroughArguments([
      "generate",
      "--name",
      "react-component",
      "--description=hello",
      "--project",
      "lexico-components",
      "--targetDirectoryPath",
      "apps/lexico",
      "--targetDirectoryPath",
      "apps/override",
      "--dry-run",
      "positional",
    ]);

    expect(result.sanitizedArguments).toStrictEqual([
      "generate",
      "--name",
      "react-component",
      "--targetDirectoryPath",
      "apps/lexico",
    ]);
    expect(result.passthroughArguments).toStrictEqual([
      "--description=hello",
      "--project",
      "lexico-components",
      "--targetDirectoryPath",
      "apps/override",
      "--dry-run",
      "positional",
    ]);
  });

  it("skips options that do not provide a value", async () => {
    const { collectGeneratorPassthroughArguments } = await importMainModule();

    const result = collectGeneratorPassthroughArguments([
      "generate",
      "--name",
      "component",
      "--project",
      "--dry-run",
    ]);

    expect(result.sanitizedArguments).toStrictEqual([
      "generate",
      "--name",
      "component",
    ]);
    expect(result.passthroughArguments).toStrictEqual([
      "--project",
      "--dry-run",
    ]);
  });

  it("ignores undefined raw argument entries", async () => {
    const { collectGeneratorPassthroughArguments } = await importMainModule();

    const result = collectGeneratorPassthroughArguments([
      "generate",
      undefined as unknown as string,
    ]);

    expect(result).toStrictEqual({
      passthroughArguments: [],
      sanitizedArguments: ["generate"],
    });
  });

  it("runs command factory and stores passthrough options in environment", async () => {
    process.argv = [
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
      "--project",
      "lexico-components",
    ];

    await importMainModule();

    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
    expect(process.argv).toStrictEqual([
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
    ]);
    expect(process.env["CONFORMETRY_GENERATOR_OPTIONS"]).toBe(
      JSON.stringify(["--project", "lexico-components"]),
    );
  });

  it("does not set passthrough environment variable when there are no forwarded options", async () => {
    process.argv = ["node", "conformetry", "generate", "--name", "component"];

    await importMainModule();

    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
    expect(process.env["CONFORMETRY_GENERATOR_OPTIONS"]).toBeUndefined();
  });

  it("falls back to default argv binary and script names when missing", async () => {
    process.argv = [];

    await importMainModule();

    expect(process.argv).toStrictEqual(["node", "conformetry"]);
    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
  });
});
