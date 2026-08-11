import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { JsonValidatorService } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorService } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorService } from "@jimmypaolini/conformetry-python";
import { TextValidatorService } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorService } from "@jimmypaolini/conformetry-typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationService } from "./validation.service";

import type {
  ValidationPluginArguments,
  ValidationPluginResult,
} from "@jimmypaolini/conformetry-configuration";

const {
  mockJsonValidate,
  mockLoadConformetryConfiguration,
  mockMarkdownValidate,
  mockPythonValidate,
  mockTextValidate,
  mockTypeScriptValidate,
} = vi.hoisted(() => {
  return {
    mockJsonValidate: vi.fn(),
    mockLoadConformetryConfiguration: vi.fn(),
    mockMarkdownValidate: vi.fn(),
    mockPythonValidate: vi.fn(),
    mockTextValidate: vi.fn(),
    mockTypeScriptValidate: vi.fn(),
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    ConfigurationService: class {
      findWorkspaceRoot(): string {
        return process.cwd();
      }

      isConformetryGeneratorDefinition(): boolean {
        return false;
      }

      loadConfigurationModule(): Record<string, unknown> {
        return {};
      }

      async loadConformetryConfiguration(
        configPath: string,
      ): Promise<{ generators: Record<string, unknown> }> {
        await Promise.resolve();
        return mockLoadConformetryConfiguration(configPath);
      }

      loadJsonConfiguration(): Record<string, unknown> {
        return {};
      }

      resolveConfigurationPath(): string {
        return "configuration/conformetry.config.ts";
      }
    },
  };
});

vi.mock("@jimmypaolini/conformetry-json", () => {
  return {
    JsonValidatorService: class {
      pluginDescriptor = { fileExtensions: [".json"], name: "json" };

      async validate(
        args: ValidationPluginArguments,
      ): Promise<ValidationPluginResult> {
        await Promise.resolve();
        return mockJsonValidate(args);
      }
    },
  };
});

vi.mock("@jimmypaolini/conformetry-markdown", () => {
  return {
    MarkdownValidatorService: class {
      pluginDescriptor = { fileExtensions: [".md"], name: "markdown" };

      async validate(
        args: ValidationPluginArguments,
      ): Promise<ValidationPluginResult> {
        await Promise.resolve();
        return mockMarkdownValidate(args);
      }
    },
  };
});

vi.mock("@jimmypaolini/conformetry-python", () => {
  return {
    PythonValidatorService: class {
      pluginDescriptor = { fileExtensions: [".py"], name: "python" };

      async validate(
        args: ValidationPluginArguments,
      ): Promise<ValidationPluginResult> {
        await Promise.resolve();
        return mockPythonValidate(args);
      }
    },
  };
});

vi.mock("@jimmypaolini/conformetry-text", () => {
  return {
    TextValidatorService: class {
      pluginDescriptor = { fileExtensions: [".txt"], name: "text" };

      async validate(
        args: ValidationPluginArguments,
      ): Promise<ValidationPluginResult> {
        await Promise.resolve();
        return mockTextValidate(args);
      }
    },
  };
});

vi.mock("@jimmypaolini/conformetry-typescript", () => {
  return {
    TypeScriptValidatorService: class {
      pluginDescriptor = { fileExtensions: [".ts"], name: "typescript" };

      async validate(
        args: ValidationPluginArguments,
      ): Promise<ValidationPluginResult> {
        await Promise.resolve();
        return mockTypeScriptValidate(args);
      }
    },
  };
});

describe(ValidationService, () => {
  beforeEach(() => {
    mockJsonValidate.mockReset();
    mockLoadConformetryConfiguration.mockReset();
    mockMarkdownValidate.mockReset();
    mockPythonValidate.mockReset();
    mockTextValidate.mockReset();
    mockTypeScriptValidate.mockReset();
  });

  it("returns success when all supplied plugins pass", async () => {
    const validationService = new ValidationService(
      new ConfigurationService(),
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
    );

    const result = await validationService.validate({
      plugins: [
        {
          descriptor: {
            fileExtensions: [".ts"],
            name: "test-plugin",
          },
          validate: async ({
            filePaths,
          }: ValidationPluginArguments): Promise<ValidationPluginResult> => {
            await Promise.resolve();
            return {
              checkedPaths: filePaths,
              ok: true,
              pluginName: "test-plugin",
              violations: [],
            };
          },
        },
      ],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
  });

  it("uses explicit project paths and returns a failed result when any plugin fails", async () => {
    const validationService = new ValidationService(
      new ConfigurationService(),
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
    );

    const result = await validationService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      plugins: [
        {
          descriptor: {
            fileExtensions: [".ts"],
            name: "pass-plugin",
          },
          validate: async ({
            filePaths,
          }: ValidationPluginArguments): Promise<ValidationPluginResult> => {
            await Promise.resolve();
            return {
              checkedPaths: filePaths,
              ok: true,
              pluginName: "pass-plugin",
              violations: [],
            };
          },
        },
        {
          descriptor: {
            fileExtensions: [".ts"],
            name: "fail-plugin",
          },
          validate: async ({
            filePaths,
          }: ValidationPluginArguments): Promise<ValidationPluginResult> => {
            await Promise.resolve();
            return {
              checkedPaths: filePaths,
              ok: false,
              pluginName: "fail-plugin",
              violations: ["demo.ts: failed"],
            };
          },
        },
      ],
      projectPaths: ["packages/demo"],
      templateRuleNames: ["nestjs-service-module"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.pluginResults[0]?.checkedPaths).toStrictEqual([
      "packages/demo",
    ]);
    expect(result.pluginResults[1]?.checkedPaths).toStrictEqual([
      "packages/demo",
    ]);
    expect(result.pluginResults[1]?.violations).toStrictEqual([
      "demo.ts: failed",
    ]);
  });

  it("loads configuration and routes rules/projects before running plugin validation", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
        "react-component": {},
      },
    });

    mockJsonValidate.mockResolvedValue({
      checkedPaths: ["packages/conformetry"],
      ok: true,
      pluginName: "json",
      violations: [],
    });

    const validationService = new ValidationService(
      new ConfigurationService(),
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
    );

    const result = await validationService.validateConfiguredSelection({
      configurationPath: "configuration/custom.config.ts",
      requestedProjectPaths: ["packages/conformetry"],
      requestedRuleNames: ["json", "react-component", "non-existent-rule"],
      workingDirectory: process.cwd(),
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/custom.config.ts",
    );
    expect(mockJsonValidate).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.pluginResults[0]?.checkedPaths).toStrictEqual([
      "packages/conformetry",
    ]);
  });

  it("uses default plugins, template rules, and working directory when optional filters are omitted", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
        "react-component": {},
      },
    });
    mockTypeScriptValidate.mockResolvedValue({
      checkedPaths: [process.cwd()],
      ok: true,
      pluginName: "typescript",
      violations: [],
    });
    mockPythonValidate.mockResolvedValue({
      checkedPaths: [process.cwd()],
      ok: true,
      pluginName: "python",
      violations: [],
    });
    mockMarkdownValidate.mockResolvedValue({
      checkedPaths: [process.cwd()],
      ok: true,
      pluginName: "markdown",
      violations: [],
    });
    mockJsonValidate.mockResolvedValue({
      checkedPaths: [process.cwd()],
      ok: true,
      pluginName: "json",
      violations: [],
    });
    mockTextValidate.mockResolvedValue({
      checkedPaths: [process.cwd()],
      ok: true,
      pluginName: "text",
      violations: [],
    });

    const validationService = new ValidationService(
      new ConfigurationService(),
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
    );

    const result = await validationService.validateConfiguredSelection({
      configurationPath: "configuration/custom.config.ts",
      workingDirectory: process.cwd(),
    });

    expect(mockTypeScriptValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: [process.cwd()],
      templateRuleNames: ["nestjs-service-module", "react-component"],
      workingDirectory: process.cwd(),
    });
    expect(mockPythonValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: [process.cwd()],
      templateRuleNames: ["nestjs-service-module", "react-component"],
      workingDirectory: process.cwd(),
    });
    expect(mockMarkdownValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: [process.cwd()],
      templateRuleNames: ["nestjs-service-module", "react-component"],
      workingDirectory: process.cwd(),
    });
    expect(mockJsonValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: [process.cwd()],
      templateRuleNames: ["nestjs-service-module", "react-component"],
      workingDirectory: process.cwd(),
    });
    expect(mockTextValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: [process.cwd()],
      templateRuleNames: ["nestjs-service-module", "react-component"],
      workingDirectory: process.cwd(),
    });
    expect(result.ok).toBe(true);
    expect(result.pluginResults).toHaveLength(5);
  });
});
