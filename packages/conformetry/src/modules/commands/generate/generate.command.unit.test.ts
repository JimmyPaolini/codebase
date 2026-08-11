import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { GenerationService } from "@jimmypaolini/conformetry-generation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TestingModule } from "@nestjs/testing";

const {
  mockCollectGeneratorInputsFromCommandArguments,
  mockLoadConformetryConfiguration,
  mockLoggerLog,
  mockRunGenerator,
} = vi.hoisted(() => {
  return {
    mockCollectGeneratorInputsFromCommandArguments:
      vi.fn<(args: unknown) => Record<string, string>>(),
    mockLoadConformetryConfiguration:
      vi.fn<
        (path: string) => Promise<{ generators: Record<string, unknown> }>
      >(),
    mockLoggerLog: vi.fn<(message: unknown) => void>(),
    mockRunGenerator: vi.fn<(input: unknown) => Promise<unknown>>(),
  };
});
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
    collectGeneratorInputsFromCommandArguments:
      mockCollectGeneratorInputsFromCommandArguments,
    ConfigurationModule: class ConfigurationModule {},
    ConfigurationService: class ConfigurationService {
      loadConformetryConfiguration = mockLoadConformetryConfiguration;
    },
  };
});

vi.mock("@jimmypaolini/conformetry-generation", () => {
  return {
    GenerationModule: class GenerationModule {},
    GenerationService: class GenerationService {
      runGenerator = mockRunGenerator;
    },
  };
});

describe("generateCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectGeneratorInputsFromCommandArguments.mockReturnValue({
      project: "lexico",
    });
    process.argv = ["node", "conformetry", "generate", "--project", "lexico"];
  });

  it("parses CLI option values", async () => {
    const { GenerateCommand } = await import("./generate.command");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationService(),
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
    const { GenerateCommand } = await import("./generate.command");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationService(),
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

    const { GenerateCommand } = await import("./generate.command");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationService(),
    );

    await expect(
      command.run([], {
        config: "configuration/conformetry.config.ts",
        name: "unknown-generator",
      }),
    ).rejects.toThrow('Unknown generator "unknown-generator"');
  });

  it("runs generator with schema-derived inputs and logs resulting file paths", async () => {
    mockCollectGeneratorInputsFromCommandArguments.mockReturnValue({
      project: "lexico-components",
    });

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
    const { GenerateCommand } = await import("./generate.command");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationService(),
    );

    await command.run(["--project", "lexico-components"], {
      config: "configuration/conformetry.config.ts",
      name: "react-component",
      targetDirectoryPath: "packages/lexico-components",
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
    );
    expect(mockCollectGeneratorInputsFromCommandArguments).toHaveBeenCalledWith(
      {
        rawArguments: ["--project", "lexico-components"],
        schema: {
          properties: {
            project: { type: "string" },
          },
        },
      },
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

    const { GenerateCommand } = await import("./generate.command");
    const command = new GenerateCommand(
      new ConfigurationService(),
      new GenerationService(),
    );

    await command.run(["--project", "lexico"], {
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
    const { GenerateCommand: ImportedGenerateCommand } =
      await import("./generate.command");
    const originalParameterTypes = Reflect.getMetadata(
      designParameterTypesMetadataKey,
      ImportedGenerateCommand,
    ) as undefined | unknown[];

    Reflect.defineMetadata(
      designParameterTypesMetadataKey,
      [],
      ImportedGenerateCommand,
    );

    let testingModule: null | TestingModule = null;

    try {
      testingModule = await Test.createTestingModule({
        providers: [
          {
            inject: [ConfigurationService, GenerationService],
            provide: ImportedGenerateCommand,
            useFactory: (
              configurationService: ConfigurationService,
              generationService: GenerationService,
            ): unknown => {
              return new ImportedGenerateCommand(
                configurationService,
                generationService,
              );
            },
          },
          {
            provide: ConfigurationService,
            useValue: {
              loadConformetryConfiguration: mockLoadConformetryConfiguration,
            },
          },
          {
            provide: GenerationService,
            useValue: {
              runGenerator: mockRunGenerator,
            },
          },
        ],
      }).compile();

      const command = testingModule.get(ImportedGenerateCommand);

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
          ImportedGenerateCommand,
        );
      } else {
        Reflect.defineMetadata(
          designParameterTypesMetadataKey,
          originalParameterTypes,
          ImportedGenerateCommand,
        );
      }
    }
  });

  it("exports the generate module for Nest registration", async () => {
    const { GenerateModule } = await import("./generate.module");
    const { GenerateCommand } = await import("./generate.command");
    const providerDefinitions = Reflect.getMetadata(
      "providers",
      GenerateModule,
    ) as Array<{
      useFactory: (
        configurationService: ConfigurationService,
        generationService: GenerationService,
      ) => GenerateCommand;
    }>;

    expect(GenerateModule).toBeDefined();
    expect(providerDefinitions).toHaveLength(1);
    expect(
      providerDefinitions[0]?.useFactory(
        new ConfigurationService(),
        new GenerationService(),
      ),
    ).toBeInstanceOf(GenerateCommand);
  });
});
