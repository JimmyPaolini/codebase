import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import {
  ValidationPluginsService,
  ValidationService,
} from "@jimmypaolini/conformetry-validation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-configuration";
import type { TestingModule } from "@nestjs/testing";

interface ValidationInputShape {
  readonly plugins: { readonly descriptor: { readonly name: string } }[];
  readonly projectPaths: string[];
  readonly templateRuleNames: string[];
  readonly workingDirectory: string;
}

const mockLoadConformetryConfiguration =
  vi.fn<(path: string) => Promise<unknown>>();
const mockBuildValidatorPlugins = vi.fn<() => ConformetryValidatorPlugin[]>();
const mockRunValidation =
  vi.fn<(input: ValidationInputShape) => Promise<unknown>>();
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

vi.mock("@jimmypaolini/conformetry-validation", () => {
  return {
    ValidationPluginsService: class ValidationPluginsService {
      buildValidatorPlugins = mockBuildValidatorPlugins;
    },
    ValidationService: class ValidationService {
      runValidation = mockRunValidation;
    },
  };
});

describe("validateCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
  });

  it("parses config, project, and rule options", async () => {
    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand(
      new ConfigurationService(),
      new ValidationService(),
      new ValidationPluginsService(),
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

  it("runs all validators with default options and working directory", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
      },
    });
    mockBuildValidatorPlugins.mockReturnValue([
      {
        descriptor: {
          fileExtensions: [".ts"],
          name: "typescript",
        },
        validate: async ({ filePaths }) => {
          await Promise.resolve();
          return {
            checkedPaths: filePaths,
            ok: true,
            pluginName: "typescript",
            violations: [],
          };
        },
      },
      {
        descriptor: {
          fileExtensions: [".py"],
          name: "python",
        },
        validate: async ({ filePaths }) => {
          await Promise.resolve();
          return {
            checkedPaths: filePaths,
            ok: true,
            pluginName: "python",
            violations: [],
          };
        },
      },
      {
        descriptor: {
          fileExtensions: [".md"],
          name: "markdown",
        },
        validate: async ({ filePaths }) => {
          await Promise.resolve();
          return {
            checkedPaths: filePaths,
            ok: true,
            pluginName: "markdown",
            violations: [],
          };
        },
      },
      {
        descriptor: {
          fileExtensions: [".json"],
          name: "json",
        },
        validate: async ({ filePaths }) => {
          await Promise.resolve();
          return {
            checkedPaths: filePaths,
            ok: true,
            pluginName: "json",
            violations: [],
          };
        },
      },
      {
        descriptor: {
          fileExtensions: [".txt"],
          name: "text",
        },
        validate: async ({ filePaths }) => {
          await Promise.resolve();
          return {
            checkedPaths: filePaths,
            ok: true,
            pluginName: "text",
            violations: [],
          };
        },
      },
    ]);
    mockRunValidation.mockResolvedValue({ ok: true, pluginResults: [] });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand(
      new ConfigurationService(),
      new ValidationService(),
      new ValidationPluginsService(),
    );

    await command.run([], {});

    const validationInput = mockRunValidation.mock.calls[0]?.[0];

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
    );
    expect(validationInput).toBeDefined();
    expect(
      validationInput?.plugins.map((plugin) => plugin.descriptor.name),
    ).toStrictEqual(["typescript", "python", "markdown", "json", "text"]);
    expect(validationInput?.projectPaths).toStrictEqual([process.cwd()]);
    expect(validationInput?.templateRuleNames).toStrictEqual([
      "nestjs-service-module",
    ]);
    expect(validationInput?.workingDirectory).toBe(process.cwd());
    expect(mockLoggerLog).toHaveBeenCalledWith(
      JSON.stringify({ ok: true, pluginResults: [] }, null, 2),
    );
  });

  it("uses local project and template rule selection when options are provided", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
        "react-component": {},
      },
    });
    mockBuildValidatorPlugins.mockReturnValue([
      {
        descriptor: {
          fileExtensions: [".json"],
          name: "json",
        },
        validate: async ({ filePaths }) => {
          await Promise.resolve();
          return {
            checkedPaths: filePaths,
            ok: true,
            pluginName: "json",
            violations: [],
          };
        },
      },
    ]);
    mockRunValidation.mockResolvedValue({ ok: true, pluginResults: [] });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand(
      new ConfigurationService(),
      new ValidationService(),
      new ValidationPluginsService(),
    );

    await command.run([], {
      config: "configuration/custom.config.ts",
      projects: ["packages/conformetry", "packages/conformetry-json"],
      rules: ["json", "react-component", "non-existent-rule"],
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/custom.config.ts",
    );

    const validationInput = mockRunValidation.mock.calls[0]?.[0];

    expect(validationInput).toBeDefined();

    expect(
      validationInput?.plugins.map((plugin) => plugin.descriptor.name),
    ).toStrictEqual(["json"]);

    expect(validationInput?.projectPaths).toStrictEqual([
      "packages/conformetry",
      "packages/conformetry-json",
    ]);

    expect(validationInput?.templateRuleNames).toStrictEqual([
      "react-component",
    ]);
  });

  it("throws when validation result is not ok", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({ generators: {} });
    mockBuildValidatorPlugins.mockReturnValue([]);
    mockRunValidation.mockResolvedValue({ ok: false, pluginResults: [] });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand(
      new ConfigurationService(),
      new ValidationService(),
      new ValidationPluginsService(),
    );

    await expect(command.run([], {})).rejects.toThrow("Validation failed");
    expect(process.exitCode).toBe(1);
  });

  it("injects command dependencies when constructor type metadata is unavailable", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
      },
    });
    mockBuildValidatorPlugins.mockReturnValue([]);
    mockRunValidation.mockResolvedValue({ ok: true, pluginResults: [] });

    const { Test } = await import("@nestjs/testing");
    const { ValidateCommand } = await import("./validate.command.js");
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
              runValidation: mockRunValidation,
            },
          },
          {
            provide: ValidationPluginsService,
            useValue: {
              buildValidatorPlugins: mockBuildValidatorPlugins,
            },
          },
        ],
      }).compile();

      const command = testingModule.get(ValidateCommand);

      await expect(command.run([], {})).resolves.toBeUndefined();
      expect(mockRunValidation).toHaveBeenCalledTimes(1);
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
