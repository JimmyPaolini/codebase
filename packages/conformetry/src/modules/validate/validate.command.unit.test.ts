import {
  ConfigurationService,
  type ConformetryConfiguration,
  InputService,
  type RunValidationResult,
} from "@jimmypaolini/conformetry-configuration";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidateCommand } from "./validate.command";

import type { LoggerService } from "../logger/logger.service";
import type { TestingModule } from "@nestjs/testing";

const mockValidateConfiguredSelection =
  vi.fn<
    (input: {
      configurationPath: string;
      requestedProjectPaths?: string[];
      requestedRuleNames?: string[];
      workingDirectory: string;
    }) => Promise<RunValidationResult>
  >();
const mockLoadConformetryConfiguration =
  vi.fn<(configurationPath: string) => Promise<ConformetryConfiguration>>();
const mockParseConfigurationPathOption =
  vi.fn<(value: string | undefined) => string | undefined>();
const mockParseProjectFilterOption =
  vi.fn<(value: string | undefined) => string[] | undefined>();
const mockParseRuleFilterOption =
  vi.fn<(value: string | undefined) => string[] | undefined>();
const mockResolveInputsFromValues = vi.fn<
  (args: {
    promptWhenMissing?: boolean;
    providedInputs: Record<string, string | undefined>;
    schema: {
      properties?: Record<string, unknown>;
      required?: string[];
    };
  }) => Promise<Record<string, string>>
>();
const mockLoggerLog = vi.fn<(message: unknown) => void>();
const designParameterTypesMetadataKey = `design:${["param", "types"].join("")}`;

vi.mock("@jimmypaolini/conformetry-validation", () => {
  function MockValidationModule(): void {}

  return {
    ValidationModule: MockValidationModule,
    ValidationService: class ValidationService {
      validateConfiguredSelection = mockValidateConfiguredSelection;
    },
  };
});

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
      parseProjectFilterOption = mockParseProjectFilterOption;
      parseRuleFilterOption = mockParseRuleFilterOption;
      resolveInputsFromValues = mockResolveInputsFromValues;
    },
  };
});

describe("validateCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    mockParseConfigurationPathOption.mockImplementation((value) => value);
    mockParseProjectFilterOption.mockImplementation((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    });
    mockParseRuleFilterOption.mockImplementation((value) => {
      if (value === undefined) {
        return undefined;
      }

      return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    });
    mockResolveInputsFromValues.mockImplementation(async (args) => {
      return await Promise.resolve({
        ...(args.providedInputs["config"] === undefined
          ? { config: "configuration/conformetry.config.ts" }
          : { config: args.providedInputs["config"] }),
        ...(args.providedInputs["projects"] === undefined
          ? {}
          : { projects: args.providedInputs["projects"] }),
        ...(args.providedInputs["rules"] === undefined
          ? {}
          : { rules: args.providedInputs["rules"] }),
      });
    });
  });

  function isConfigurationService(
    value: unknown,
  ): value is ConfigurationService {
    return (
      typeof value === "object" &&
      value !== null &&
      "loadConformetryConfiguration" in value
    );
  }

  function createConfigurationService(): ConfigurationService {
    const configurationService = {
      loadConformetryConfiguration: mockLoadConformetryConfiguration,
    };

    if (!isConfigurationService(configurationService)) {
      throw new Error("Failed to create configuration service mock.");
    }

    return configurationService;
  }

  function isValidationService(value: unknown): value is ValidationService {
    return (
      typeof value === "object" &&
      value !== null &&
      "validateConfiguredSelection" in value
    );
  }

  function createValidationService(): ValidationService {
    const validationService = {
      validateConfiguredSelection: mockValidateConfiguredSelection,
    };

    if (!isValidationService(validationService)) {
      throw new Error("Failed to create validation service mock.");
    }

    return validationService;
  }

  function createInputService(): InputService {
    return new InputService();
  }

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

  function createCommand(): ValidateCommand {
    return new ValidateCommand(
      createInputService(),
      createConfigurationService(),
      createValidationService(),
      createLoggerService(),
    );
  }

  it("parses config, project, and rule options", () => {
    const command = createCommand();

    expect(command.parseConfig(" configuration/conformetry.config.ts ")).toBe(
      " configuration/conformetry.config.ts ",
    );
    expect(command.parseConfig(undefined)).toBeUndefined();
    expect(mockParseConfigurationPathOption).toHaveBeenCalledWith(
      " configuration/conformetry.config.ts ",
    );
    expect(mockParseConfigurationPathOption).toHaveBeenCalledWith(undefined);
    expect(command.parseProjects("lexico, conformetry , ,")).toStrictEqual([
      "lexico",
      "conformetry",
    ]);
    expect(command.parseProjects(undefined)).toBeUndefined();
    expect(mockParseProjectFilterOption).toHaveBeenCalledWith(
      "lexico, conformetry , ,",
    );
    expect(mockParseProjectFilterOption).toHaveBeenCalledWith(undefined);
    expect(command.parseRules("typescript, markdown, ,")).toStrictEqual([
      "typescript",
      "markdown",
    ]);
    expect(command.parseRules(undefined)).toBeUndefined();
    expect(mockParseRuleFilterOption).toHaveBeenCalledWith(
      "typescript, markdown, ,",
    );
    expect(mockParseRuleFilterOption).toHaveBeenCalledWith(undefined);
  });

  it("prompts for missing validate options through InputService", async () => {
    const command = createCommand();
    mockResolveInputsFromValues.mockResolvedValue({
      config: "configuration/custom.config.ts",
      projects: "packages/conformetry,packages/conformetry-json",
      rules: "json,typescript",
    });
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {},
    });
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: true,
      pluginResults: [],
    });

    await command.run([], {});

    expect(mockResolveInputsFromValues).toHaveBeenCalledTimes(1);
    expect(mockValidateConfiguredSelection).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      requestedProjectPaths: [
        "packages/conformetry",
        "packages/conformetry-json",
      ],
      requestedRuleNames: ["json", "typescript"],
      workingDirectory: process.cwd(),
    });
  });

  it("delegates validation orchestration to ValidationService with defaults", async () => {
    const command = createCommand();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {},
    });
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: true,
      pluginResults: [],
    });

    await command.run([], {});

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
    );
    expect(mockValidateConfiguredSelection).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      workingDirectory: process.cwd(),
    });
    expect(mockLoggerLog).toHaveBeenCalledWith(
      JSON.stringify({ ok: true, pluginResults: [] }, null, 2),
    );
  });

  it("passes through provided config/project/rule options", async () => {
    const command = createCommand();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {},
    });
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: true,
      pluginResults: [],
    });

    await command.run([], {
      config: "configuration/custom.config.ts",
      projects: ["packages/conformetry", "packages/conformetry-json"],
      rules: ["json", "react-component"],
    });

    expect(mockValidateConfiguredSelection).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      requestedProjectPaths: [
        "packages/conformetry",
        "packages/conformetry-json",
      ],
      requestedRuleNames: ["json", "react-component"],
      workingDirectory: process.cwd(),
    });
  });

  it("throws when validation result is not ok", async () => {
    const command = createCommand();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {},
    });
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: false,
      pluginResults: [],
    });

    await expect(command.run([], {})).rejects.toThrow("Validation failed");
    expect(process.exitCode).toBe(1);
  });

  it("injects command dependencies when constructor type metadata is unavailable", async () => {
    const { Test } = await import("@nestjs/testing");
    const configurationService = createConfigurationService();
    const validationService = createValidationService();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {},
    });
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: true,
      pluginResults: [],
    });

    const originalParameterTypes = Reflect.getMetadata(
      designParameterTypesMetadataKey,
      ValidateCommand,
    ) as undefined | unknown[];

    Reflect.defineMetadata(
      designParameterTypesMetadataKey,
      [],
      ValidateCommand,
    );

    let testingModule: null | TestingModule = null;

    try {
      testingModule = await Test.createTestingModule({
        providers: [
          {
            inject: [
              InputService,
              ConfigurationService,
              ValidationService,
              "LOGGER_SERVICE_TOKEN",
            ],
            provide: ValidateCommand,
            useFactory: (
              inputService: InputService,
              configurationService: ConfigurationService,
              validationService: ValidationService,
              loggerService: LoggerService,
            ): ValidateCommand => {
              return new ValidateCommand(
                inputService,
                configurationService,
                validationService,
                loggerService,
              );
            },
          },
          {
            provide: ConfigurationService,
            useValue: configurationService,
          },
          {
            provide: InputService,
            useValue: createInputService(),
          },
          {
            provide: ValidationService,
            useValue: validationService,
          },
          {
            provide: "LOGGER_SERVICE_TOKEN",
            useValue: createLoggerService(),
          },
        ],
      }).compile();

      const command = testingModule.get(ValidateCommand);

      await expect(command.run([], {})).resolves.toBeUndefined();
      expect(mockLoadConformetryConfiguration).toHaveBeenCalledTimes(1);
      expect(mockValidateConfiguredSelection).toHaveBeenCalledTimes(1);
    } finally {
      if (testingModule !== null) {
        await testingModule.close();
      }

      if (originalParameterTypes === undefined) {
        Reflect.deleteMetadata(
          designParameterTypesMetadataKey,
          ValidateCommand,
        );
      } else {
        Reflect.defineMetadata(
          designParameterTypesMetadataKey,
          originalParameterTypes,
          ValidateCommand,
        );
      }
    }
  });

  it("exports the validate module for Nest registration", async () => {
    const { ValidateModule } = await import("./validate.module");
    const { ValidateCommand: ImportedValidateCommand } =
      await import("./validate.command");
    type ImportedValidateCommandType = InstanceType<
      typeof ImportedValidateCommand
    >;
    const providerDefinitions = Reflect.getMetadata(
      "providers",
      ValidateModule,
    ) as {
      useFactory: (
        inputService: InputService,
        configurationService: ConfigurationService,
        validationService: ValidationService,
        loggerService: LoggerService,
      ) => ImportedValidateCommandType;
    }[];

    expect(ValidateModule).toBeDefined();
    expect(providerDefinitions).toHaveLength(1);
    expect(
      providerDefinitions[0]?.useFactory(
        createInputService(),
        new ConfigurationService(),
        createValidationService(),
        createLoggerService(),
      ),
    ).toBeInstanceOf(ImportedValidateCommand);
  });
});
