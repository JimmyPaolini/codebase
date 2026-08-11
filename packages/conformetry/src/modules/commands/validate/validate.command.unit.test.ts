import {
  ConfigurationService,
  type ConformetryConfiguration,
  type RunValidationResult,
} from "@jimmypaolini/conformetry-configuration";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidateCommand } from "./validate.command.js";

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

vi.mock("@jimmypaolini/conformetry-validation", () => {
  return {
    ValidationService: class ValidationService {
      validateConfiguredSelection = mockValidateConfiguredSelection;
    },
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  function parseCommaDelimitedOption(
    value: string | undefined,
  ): string[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return {
    ConfigurationService: class ConfigurationService {
      loadConformetryConfiguration = mockLoadConformetryConfiguration;
    },
    parseCommaDelimitedOption,
  };
});

describe("validateCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
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

  function createCommand(): ValidateCommand {
    return new ValidateCommand(
      createConfigurationService(),
      createValidationService(),
    );
  }

  it("parses config, project, and rule options", () => {
    const command = createCommand();

    expect(command.parseConfig("configuration/conformetry.config.ts")).toBe(
      "configuration/conformetry.config.ts",
    );
    expect(command.parseConfig(undefined)).toBeUndefined();
    expect(command.parseProjects("lexico, conformetry , ,")).toStrictEqual([
      "lexico",
      "conformetry",
    ]);
    expect(command.parseProjects(undefined)).toBeUndefined();
    expect(command.parseRules("typescript, markdown, ,")).toStrictEqual([
      "typescript",
      "markdown",
    ]);
    expect(command.parseRules(undefined)).toBeUndefined();
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
          ValidateCommand,
          {
            provide: ConfigurationService,
            useValue: configurationService,
          },
          {
            provide: ValidationService,
            useValue: validationService,
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
});
