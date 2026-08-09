import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TestingModule } from "@nestjs/testing";

const mockValidateConfiguredSelection =
  vi.fn<
    (input: {
      configurationPath: string;
      requestedProjectPaths?: string[];
      requestedRuleNames?: string[];
      workingDirectory: string;
    }) => Promise<unknown>
  >();
const mockLoadConformetryConfiguration =
  vi.fn<(configurationPath: string) => Promise<unknown>>();
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

vi.mock("@jimmypaolini/conformetry-configuration", async () => {
  const actual = await vi.importActual(
    "@jimmypaolini/conformetry-configuration",
  );

  return {
    ...actual,
    ConfigurationService: class ConfigurationService {
      loadConformetryConfiguration = mockLoadConformetryConfiguration;
    },
  };
});

describe("validateCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadConformetryConfiguration.mockResolvedValue({ generators: {} });
    process.exitCode = 0;
  });

  function createValidationService(): ValidationService {
    return new ValidationService(
      {
        loadConformetryConfiguration: mockLoadConformetryConfiguration,
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".ts"], name: "typescript" },
        validate: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".py"], name: "python" },
        validate: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".md"], name: "markdown" },
        validate: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".json"], name: "json" },
        validate: vi.fn(),
      } as never,
      {
        pluginDescriptor: { fileExtensions: [".txt"], name: "text" },
        validate: vi.fn(),
      } as never,
    );
  }

  it("parses config, project, and rule options", async () => {
    const { ValidateCommand } = await import("./validate.command");
    const { ConfigurationService } =
      await import("@jimmypaolini/conformetry-configuration");
    const command = new ValidateCommand(
      new ConfigurationService(),
      createValidationService(),
    );

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
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: true,
      pluginResults: [],
    });

    const { ValidateCommand } = await import("./validate.command");
    const { ConfigurationService } =
      await import("@jimmypaolini/conformetry-configuration");
    const command = new ValidateCommand(
      new ConfigurationService(),
      createValidationService(),
    );

    await command.run([], {});

    expect(mockValidateConfiguredSelection).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      workingDirectory: process.cwd(),
    });
    expect(mockLoggerLog).toHaveBeenCalledWith(
      JSON.stringify({ ok: true, pluginResults: [] }, null, 2),
    );
  });

  it("passes through provided config/project/rule options", async () => {
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: true,
      pluginResults: [],
    });

    const { ValidateCommand } = await import("./validate.command");
    const { ConfigurationService } =
      await import("@jimmypaolini/conformetry-configuration");
    const command = new ValidateCommand(
      new ConfigurationService(),
      createValidationService(),
    );

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
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: false,
      pluginResults: [],
    });

    const { ValidateCommand } = await import("./validate.command");
    const { ConfigurationService } =
      await import("@jimmypaolini/conformetry-configuration");
    const command = new ValidateCommand(
      new ConfigurationService(),
      createValidationService(),
    );

    await expect(command.run([], {})).rejects.toThrow("Validation failed");
    expect(process.exitCode).toBe(1);
  });

  it("injects command dependencies when constructor type metadata is unavailable", async () => {
    mockValidateConfiguredSelection.mockResolvedValue({
      ok: true,
      pluginResults: [],
    });

    const { Test } = await import("@nestjs/testing");
    const { ConfigurationService } =
      await import("@jimmypaolini/conformetry-configuration");
    const { ValidateCommand } = await import("./validate.command");
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
            useValue: {
              loadConformetryConfiguration: mockLoadConformetryConfiguration,
            },
          },
          {
            provide: ValidationService,
            useValue: {
              validateConfiguredSelection: mockValidateConfiguredSelection,
            },
          },
        ],
      }).compile();

      const command = testingModule.get(ValidateCommand);

      await expect(command.run([], {})).resolves.toBeUndefined();
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
