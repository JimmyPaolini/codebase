import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadConformetryConfiguration =
  vi.fn<(path: string) => Promise<{ generators: Record<string, unknown> }>>();
const mockRunGenerator = vi.fn<(input: unknown) => Promise<unknown>>();
const mockReadFile =
  vi.fn<(path: string, encoding: string) => Promise<string>>();
const mockLoggerLog = vi.fn<(message: unknown) => void>();

vi.mock("node:fs/promises", () => {
  return {
    readFile: mockReadFile,
  };
});

vi.mock("@nestjs/common", async () => {
  const actual = await vi.importActual("@nestjs/common");

  class MockConsoleLogger {
    public context?: string;

    log(message: unknown): void {
      mockLoggerLog(message);
    }

    setContext(context: string): void {
      this.context = context;
    }
  }

  return {
    ...actual,
    ConsoleLogger: MockConsoleLogger,
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    ConfigurationService: class ConfigurationService {
      loadConformetryConfiguration = mockLoadConformetryConfiguration;
    },
  };
});

vi.mock("@jimmypaolini/conformetry-generation", () => {
  function MockTemplateRenderer(): void {}

  function MockNodeFileSystemAdapter(): void {}

  function MockNoopFormatterAdapter(): void {}

  return {
    DefaultTemplateRenderer: MockTemplateRenderer,
    GenerationRuntimeService: class GenerationRuntimeService {
      runGenerator = mockRunGenerator;
    },
    NodeFileSystemAdapter: MockNodeFileSystemAdapter,
    NoopFormatterAdapter: MockNoopFormatterAdapter,
  };
});

describe("generateCommand", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.argv = ["node", "conformetry", "generate", "--project", "lexico"];
    delete process.env["CONFORMETRY_GENERATOR_OPTIONS"];
  });

  it("parses CLI option values", async () => {
    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand();

    expect(command.parseConfig("configuration/conformetry.config.ts")).toBe(
      "configuration/conformetry.config.ts",
    );
    expect(command.parseName("react-component")).toBe("react-component");
    expect(command.parseTargetDirectoryPath("packages/conformetry")).toBe(
      "packages/conformetry",
    );
    expect(command.parseTargetDirectoryPath(undefined)).toBeUndefined();
  });

  it("throws when required options are missing", async () => {
    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand();

    await expect(command.run([], { name: "react-component" })).rejects.toThrow(
      "Both --config and --name are required",
    );
    await expect(
      command.run([], { config: "configuration/config.ts" }),
    ).rejects.toThrow("Both --config and --name are required");
  });

  it("throws when generator name does not exist in configuration", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {},
    });

    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand();

    await expect(
      command.run([], {
        config: "configuration/conformetry.config.ts",
        name: "unknown-generator",
      }),
    ).rejects.toThrow('Unknown generator "unknown-generator"');
  });

  it("runs generator with schema-derived inputs and logs resulting file paths", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "react-component": {
          aliases: ["component"],
          description: "Create a React component",
          name: "react-component",
          schemaPath: "./schema.json",
          targetPathStrategy: "append",
          templateDirectoryPath: "./templates",
        },
      },
    });
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        properties: {
          project: { type: "string" },
        },
      }),
    );
    mockRunGenerator.mockResolvedValue({
      generatedFilePaths: ["output/button.tsx"],
      outputDirectoryPath: "generated/react-component",
    });
    process.env["CONFORMETRY_GENERATOR_OPTIONS"] = JSON.stringify([
      "--project",
      "lexico-components",
    ]);

    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand();

    await command.run([], {
      config: "configuration/conformetry.config.ts",
      name: "react-component",
      targetDirectoryPath: "packages/lexico-components",
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
    );
    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining("schema.json"),
      "utf8",
    );
    expect(mockRunGenerator).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: {
          name: "react-component",
          project: "lexico-components",
        },
        targetDirectoryPath: "packages/lexico-components",
      }),
    );
    expect(mockLoggerLog).toHaveBeenCalledWith(
      JSON.stringify(
        {
          generatedFilePaths: ["output/button.tsx"],
          outputDirectoryPath: "generated/react-component",
        },
        null,
        2,
      ),
    );
  });

  it("uses argv and default target path when optional values are absent", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "react-component": {
          name: "react-component",
          schemaPath: "./schema.json",
          targetPathStrategy: "append",
          templateDirectoryPath: "./templates",
        },
      },
    });
    mockReadFile.mockResolvedValue(
      JSON.stringify({
        properties: {
          project: { type: "string" },
        },
      }),
    );
    mockRunGenerator.mockResolvedValue({
      generatedFilePaths: [],
      outputDirectoryPath: "generated/react-component",
    });

    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand();

    await command.run([], {
      config: "configuration/conformetry.config.ts",
      name: "react-component",
    });

    expect(mockRunGenerator).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: {
          name: "react-component",
          project: "lexico",
        },
        targetDirectoryPath: "generated/react-component",
      }),
    );
  });
});
