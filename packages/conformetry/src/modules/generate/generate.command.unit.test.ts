import {
  ConfigurationService,
  InputService,
} from "@jimmypaolini/conformetry-configuration";
import { GenerationService } from "@jimmypaolini/conformetry-generation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoggerService } from "../logger/logger.service";
import type { TestingModule } from "@nestjs/testing";

const {
  mockLoadConformetryConfiguration,
  mockLoggerLog,
  mockParseConfigurationPathOption,
  mockParseGeneratorNameOption,
  mockParseTargetDirectoryPathOption,
  mockResolveGeneratorInputs,
  mockRunGenerator,
} = vi.hoisted(() => {
  return {
    mockLoadConformetryConfiguration:
      vi.fn<
        (path: string) => Promise<{ generators: Record<string, unknown> }>
      >(),
    mockLoggerLog: vi.fn<(message: unknown) => void>(),
    mockParseConfigurationPathOption:
      vi.fn<(value: string | undefined) => string | undefined>(),
    mockParseGeneratorNameOption: vi.fn<(value: string) => string>(),
    mockParseTargetDirectoryPathOption:
      vi.fn<(value: string | undefined) => string | undefined>(),
    mockResolveGeneratorInputs:
      vi.fn<(args: unknown) => Promise<Record<string, string>>>(),
    mockRunGenerator: vi.fn<(input: unknown) => Promise<unknown>>(),
  };
});
const designParameterTypesMetadataKey = `design:${["param", "types"].join("")}`;

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  function MockConfigurationModule(): void {}
  function MockInputModule(): void {}

  return {
    ConfigurationModule: MockConfigurationModule,
    ConfigurationService: class ConfigurationService {
      loadConformetryConfiguration = mockLoadConformetryConfiguration;
    },
    InputModule: MockInputModule,
    InputService: class InputService {
      parseConfigurationPathOption = mockParseConfigurationPathOption;
      parseGeneratorNameOption = mockParseGeneratorNameOption;
      parseTargetDirectoryPathOption = mockParseTargetDirectoryPathOption;
      resolveGeneratorInputs = mockResolveGeneratorInputs;
    },
  };
});

vi.mock("@jimmypaolini/conformetry-generation", () => {
  function MockGenerationModule(): void {}

  return {
    GenerationModule: MockGenerationModule,
    GenerationService: class GenerationService {
      runGenerator = mockRunGenerator;
    },
  };
});

describe("generateCommand", () => {
  function isLoggerService(value: unknown): value is LoggerService {
    return (
      typeof value === "object" &&
      value !== null &&
      "log" in value &&
      "setContext" in value
    );
  }

  function createLoggerService(): LoggerService {
    const loggerService = {
      log: mockLoggerLog,
      setContext: vi.fn<(context: string) => void>(),
    };

    if (!isLoggerService(loggerService)) {
      throw new Error("Failed to create logger service mock.");
    }

    return loggerService;
  }

  function createInputService(): InputService {
    return new InputService();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockParseConfigurationPathOption.mockImplementation((value) => value);
    mockParseGeneratorNameOption.mockImplementation((value) => value);
    mockParseTargetDirectoryPathOption.mockImplementation((value) => value);
    mockResolveGeneratorInputs.mockResolvedValue({
      project: "lexico",
    });
    process.argv = ["node", "conformetry", "generate", "--project", "lexico"];
  });

  it("parses CLI option values", async () => {
    const { GenerateCommand } = await import("./generate.command");
    const command = new GenerateCommand(
      createInputService(),
      new ConfigurationService(),
      new GenerationService(),
      createLoggerService(),
    );

    expect(command.parseConfig("configuration/conformetry.config.ts")).toBe(
      "configuration/conformetry.config.ts",
    );
    expect(command.parseName("react-component")).toBe("react-component");
    expect(command.parseTargetDirectoryPath("packages/conformetry")).toBe(
      "packages/conformetry",
    );
    expect(command.parseTargetDirectoryPath(undefined)).toBeUndefined();
    expect(mockParseConfigurationPathOption).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
    );
    expect(mockParseGeneratorNameOption).toHaveBeenCalledWith(
      "react-component",
    );
    expect(mockParseTargetDirectoryPathOption).toHaveBeenCalledWith(
      "packages/conformetry",
    );
    expect(mockParseTargetDirectoryPathOption).toHaveBeenCalledWith(undefined);
  });

  it("throws when required options are missing", async () => {
    const { GenerateCommand } = await import("./generate.command");
    const command = new GenerateCommand(
      createInputService(),
      new ConfigurationService(),
      new GenerationService(),
      createLoggerService(),
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
      createInputService(),
      new ConfigurationService(),
      new GenerationService(),
      createLoggerService(),
    );

    await expect(
      command.run([], {
        config: "configuration/conformetry.config.ts",
        name: "unknown-generator",
      }),
    ).rejects.toThrow('Unknown generator "unknown-generator"');
  });

  it("runs generator with schema-derived inputs and logs resulting file paths", async () => {
    mockResolveGeneratorInputs.mockResolvedValue({
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
      createInputService(),
      new ConfigurationService(),
      new GenerationService(),
      createLoggerService(),
    );

    await command.run(["--project", "lexico-components"], {
      config: "configuration/conformetry.config.ts",
      name: "react-component",
      targetDirectoryPath: "packages/lexico-components",
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
    );
    expect(mockResolveGeneratorInputs).toHaveBeenCalledWith({
      rawArguments: ["--project", "lexico-components"],
      schema: {
        properties: {
          project: { type: "string" },
        },
      },
    });
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
      createInputService(),
      new ConfigurationService(),
      new GenerationService(),
      createLoggerService(),
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
            inject: [
              "INPUT_SERVICE_TOKEN",
              ConfigurationService,
              GenerationService,
              "LOGGER_SERVICE_TOKEN",
            ],
            provide: ImportedGenerateCommand,
            useFactory: (
              inputService: InputService,
              configurationService: ConfigurationService,
              generationService: GenerationService,
              loggerService: LoggerService,
            ): unknown => {
              return new ImportedGenerateCommand(
                inputService,
                configurationService,
                generationService,
                loggerService,
              );
            },
          },
          {
            provide: "INPUT_SERVICE_TOKEN",
            useValue: createInputService(),
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
          {
            provide: "LOGGER_SERVICE_TOKEN",
            useValue: createLoggerService(),
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
    const { GenerateCommand: ImportedGenerateCommand } =
      await import("./generate.command");
    type ImportedGenerateCommandType = InstanceType<
      typeof ImportedGenerateCommand
    >;
    const providerDefinitions = Reflect.getMetadata(
      "providers",
      GenerateModule,
    ) as {
      useFactory: (
        inputService: InputService,
        configurationService: ConfigurationService,
        generationService: GenerationService,
        loggerService: LoggerService,
      ) => ImportedGenerateCommandType;
    }[];

    expect(GenerateModule).toBeDefined();
    expect(providerDefinitions).toHaveLength(1);
    expect(
      providerDefinitions[0]?.useFactory(
        createInputService(),
        new ConfigurationService(),
        new GenerationService(),
        createLoggerService(),
      ),
    ).toBeInstanceOf(ImportedGenerateCommand);
  });
});
