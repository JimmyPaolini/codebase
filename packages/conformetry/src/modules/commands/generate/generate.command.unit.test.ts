import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { GenerationRuntimeService } from "@jimmypaolini/conformetry-generation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GenerateCommandArgumentsService } from "./generate-command-arguments.service.js";

import type { TestingModule } from "@nestjs/testing";

const mockLoadConformetryConfiguration =
  vi.fn<(path: string) => Promise<{ generators: Record<string, unknown> }>>();
const mockRunGenerator = vi.fn<(input: unknown) => Promise<unknown>>();
const mockLoggerLog = vi.fn<(message: unknown) => void>();
const designParameterTypesMetadataKey = `design:${["param", "types"].join("")}`;

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
  return {
    GenerationRuntimeService: class GenerationRuntimeService {
      runGenerator = mockRunGenerator;
    },
  };
});

describe("generateCommand", () => {
  const createGenerateCommandArgumentsService =
    (): GenerateCommandArgumentsService => {
      return new GenerateCommandArgumentsService();
    };

  beforeEach(() => {
    vi.clearAllMocks();
    process.argv = ["node", "conformetry", "generate", "--project", "lexico"];
    delete process.env["CONFORMETRY_GENERATOR_OPTIONS"];
  });

  it("parses CLI option values", async () => {
    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationRuntimeService(),
      createGenerateCommandArgumentsService(),
    );

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
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationRuntimeService(),
      createGenerateCommandArgumentsService(),
    );

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
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationRuntimeService(),
      createGenerateCommandArgumentsService(),
    );

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
          parameters: {
            project: { type: "string" },
          },
          templateDirectoryPath: "./templates",
        },
      },
    });
    mockRunGenerator.mockResolvedValue({
      generatedFilePaths: ["output/button.tsx"],
      outputDirectoryPath: "generated/react-component",
    });
    process.env["CONFORMETRY_GENERATOR_OPTIONS"] = JSON.stringify([
      "--project",
      "lexico-components",
    ]);

    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationRuntimeService(),
      createGenerateCommandArgumentsService(),
    );

    await command.run([], {
      config: "configuration/conformetry.config.ts",
      name: "react-component",
      targetDirectoryPath: "packages/lexico-components",
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
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
          parameters: {
            project: { type: "string" },
          },
          templateDirectoryPath: "./templates",
        },
      },
    });
    mockRunGenerator.mockResolvedValue({
      generatedFilePaths: [],
      outputDirectoryPath: "generated/react-component",
    });

    const { GenerateCommand } = await import("./generate.command.js");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationRuntimeService(),
      createGenerateCommandArgumentsService(),
    );

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

  it("injects command dependencies when constructor type metadata is unavailable", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "react-component": {
          name: "react-component",
          parameters: {
            project: { type: "string" },
          },
          templateDirectoryPath: "./templates",
        },
      },
    });
    mockRunGenerator.mockResolvedValue({
      generatedFilePaths: [],
      outputDirectoryPath: "generated/react-component",
    });

    const { Test } = await import("@nestjs/testing");
    const { GenerateCommand } = await import("./generate.command.js");
    const originalParameterTypes = Reflect.getMetadata(
      designParameterTypesMetadataKey,
      GenerateCommand,
    ) as undefined | unknown[];

    Reflect.defineMetadata(
      designParameterTypesMetadataKey,
      [],
      GenerateCommand,
    );

    let testingModule: null | TestingModule = null;

    try {
      testingModule = await Test.createTestingModule({
        providers: [
          GenerateCommand,
          GenerateCommandArgumentsService,
          {
            provide: ConfigurationService,
            useValue: {
              loadConformetryConfiguration: mockLoadConformetryConfiguration,
            },
          },
          {
            provide: GenerationRuntimeService,
            useValue: {
              runGenerator: mockRunGenerator,
            },
          },
        ],
      }).compile();

      const command = testingModule.get(GenerateCommand);

      await expect(
        command.run([], {
          config: "configuration/conformetry.config.ts",
          name: "react-component",
        }),
      ).resolves.toBeUndefined();
      expect(mockRunGenerator).toHaveBeenCalledTimes(1);
    } finally {
      if (testingModule !== null) {
        await testingModule.close();
      }

      if (originalParameterTypes === undefined) {
        Reflect.deleteMetadata(
          designParameterTypesMetadataKey,
          GenerateCommand,
        );
      } else {
        Reflect.defineMetadata(
          designParameterTypesMetadataKey,
          originalParameterTypes,
          GenerateCommand,
        );
      }
    }
  });
});
