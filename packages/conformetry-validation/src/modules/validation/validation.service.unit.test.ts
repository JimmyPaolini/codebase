import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { JsonValidatorService } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorService } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorService } from "@jimmypaolini/conformetry-python";
import { TextValidatorService } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorService } from "@jimmypaolini/conformetry-typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ValidationService } from "./validation.service";

import type {
  ValidationPluginArguments,
  ValidationPluginResult,
} from "@jimmypaolini/conformetry-configuration";

type LoadConformetryConfigurationMock = (
  configurationPath: string,
) => Promise<{ generators: Record<string, unknown> }>;

type ValidationPluginValidateMock = (
  args: ValidationPluginArguments,
) => Promise<ValidationPluginResult>;

const {
  mockJsonValidate,
  mockLoadConformetryConfiguration,
  mockMarkdownValidate,
  mockPythonValidate,
  mockTextValidate,
  mockTypeScriptValidate,
} = vi.hoisted(() => {
  return {
    mockJsonValidate: vi.fn<ValidationPluginValidateMock>(),
    mockLoadConformetryConfiguration: vi.fn<LoadConformetryConfigurationMock>(),
    mockMarkdownValidate: vi.fn<ValidationPluginValidateMock>(),
    mockPythonValidate: vi.fn<ValidationPluginValidateMock>(),
    mockTextValidate: vi.fn<ValidationPluginValidateMock>(),
    mockTypeScriptValidate: vi.fn<ValidationPluginValidateMock>(),
  };
});

const temporaryDirectoryPaths: string[] = [];

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
        return await mockLoadConformetryConfiguration(configPath);
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
        return await mockJsonValidate(args);
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
        return await mockMarkdownValidate(args);
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
        return await mockPythonValidate(args);
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
        return await mockTextValidate(args);
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
        return await mockTypeScriptValidate(args);
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

  afterEach(() => {
    for (const temporaryDirectoryPath of temporaryDirectoryPaths) {
      fs.rmSync(temporaryDirectoryPath, { force: true, recursive: true });
    }
    temporaryDirectoryPaths.length = 0;
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

  it("uses discovered project paths when explicit project paths are omitted", async () => {
    const workingDirectory = createTemporaryDirectoryPath();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "jupyter-notebook-application": {},
        "nestjs-service-module": {},
        "react-component": {},
      },
    });
    writeNxJsonConfiguration(workingDirectory);
    mockTypeScriptValidate.mockResolvedValue(createPassingValidationResult());
    mockPythonValidate.mockResolvedValue(createPassingValidationResult());
    mockMarkdownValidate.mockResolvedValue(createPassingValidationResult());
    mockJsonValidate.mockResolvedValue(createPassingValidationResult());
    mockTextValidate.mockResolvedValue(createPassingValidationResult());

    writeProjectMetadata({
      projectMetadata: {
        name: "affirmations",
        sourceRoot: "applications/affirmations",
        tags: ["generator:jupyter-notebook-application", "language:python"],
      },
      relativeProjectPath: "applications/affirmations",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "conformetry",
        sourceRoot: "packages/conformetry",
        tags: ["generator:nestjs-service-module"],
      },
      relativeProjectPath: "packages/conformetry",
      workingDirectory,
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
      workingDirectory,
    });

    expect(mockTypeScriptValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: ["applications/affirmations", "packages/conformetry"],
      templateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-service-module",
      ],
      workingDirectory,
    });
    expect(result.ok).toBe(true);
  });

  it("returns an explanatory failure result when no project roots are discovered", async () => {
    const workingDirectory = createTemporaryDirectoryPath();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
      },
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
      workingDirectory,
    });

    expect(mockTypeScriptValidate).not.toHaveBeenCalled();
    expect(mockPythonValidate).not.toHaveBeenCalled();
    expect(mockMarkdownValidate).not.toHaveBeenCalled();
    expect(mockJsonValidate).not.toHaveBeenCalled();
    expect(mockTextValidate).not.toHaveBeenCalled();
    expect(result).toStrictEqual({
      ok: false,
      pluginResults: [
        {
          checkedPaths: [],
          ok: false,
          pluginName: "workspace-discovery",
          violations: [`No project paths were found under ${workingDirectory}`],
        },
      ],
    });
  });

  it("loads configuration and routes rules/projects before running plugin validation", async () => {
    const workingDirectory = createTemporaryDirectoryPath();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-command-project": {},
        "react-component": {},
      },
    });
    writeNxJsonConfiguration(workingDirectory);
    writeProjectMetadata({
      projectMetadata: {
        name: "caelundas",
        sourceRoot: "applications/caelundas",
        tags: ["framework:nest-commander", "generator:nestjs-command-project"],
      },
      relativeProjectPath: "applications/caelundas",
      workingDirectory,
    });

    mockJsonValidate.mockResolvedValue({
      checkedPaths: ["applications/caelundas"],
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
      requestedProjectPaths: ["caelundas"],
      requestedRuleNames: [
        "json",
        "nestjs-command-project",
        "non-existent-rule",
      ],
      workingDirectory,
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/custom.config.ts",
    );
    expect(mockJsonValidate).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.pluginResults[0]?.checkedPaths).toStrictEqual([
      "applications/caelundas",
    ]);
  });

  it("uses default plugins, template rules, and working directory when optional filters are omitted", async () => {
    const workingDirectory = createTemporaryDirectoryPath();
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "jupyter-notebook-application": {},
        "nestjs-command-project": {},
        "react-component": {},
      },
    });
    writeNxJsonConfiguration(workingDirectory);
    writeProjectMetadata({
      projectMetadata: {
        name: "affirmations",
        sourceRoot: "applications/affirmations",
        tags: ["generator:jupyter-notebook-application", "language:python"],
      },
      relativeProjectPath: "applications/affirmations",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "caelundas",
        sourceRoot: "applications/caelundas",
        tags: ["framework:nest-commander", "generator:nestjs-command-project"],
      },
      relativeProjectPath: "applications/caelundas",
      workingDirectory,
    });
    writeProjectMetadata({
      projectMetadata: {
        name: "lexico",
        sourceRoot: "applications/lexico/src",
        tags: ["framework:react", "language:typescript"],
      },
      relativeProjectPath: "applications/lexico",
      workingDirectory,
    });
    mockTypeScriptValidate.mockResolvedValue({
      checkedPaths: ["applications/affirmations", "applications/caelundas"],
      ok: true,
      pluginName: "typescript",
      violations: [],
    });
    mockPythonValidate.mockResolvedValue({
      checkedPaths: ["applications/affirmations", "applications/caelundas"],
      ok: true,
      pluginName: "python",
      violations: [],
    });
    mockMarkdownValidate.mockResolvedValue({
      checkedPaths: ["applications/affirmations", "applications/caelundas"],
      ok: true,
      pluginName: "markdown",
      violations: [],
    });
    mockJsonValidate.mockResolvedValue({
      checkedPaths: ["applications/affirmations", "applications/caelundas"],
      ok: true,
      pluginName: "json",
      violations: [],
    });
    mockTextValidate.mockResolvedValue({
      checkedPaths: ["applications/affirmations", "applications/caelundas"],
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
      workingDirectory,
    });

    expect(mockTypeScriptValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: ["applications/affirmations", "applications/caelundas"],
      templateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
      ],
      workingDirectory,
    });
    expect(mockPythonValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: ["applications/affirmations", "applications/caelundas"],
      templateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
      ],
      workingDirectory,
    });
    expect(mockMarkdownValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: ["applications/affirmations", "applications/caelundas"],
      templateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
      ],
      workingDirectory,
    });
    expect(mockJsonValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: ["applications/affirmations", "applications/caelundas"],
      templateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
      ],
      workingDirectory,
    });
    expect(mockTextValidate).toHaveBeenCalledWith({
      configurationPath: "configuration/custom.config.ts",
      filePaths: ["applications/affirmations", "applications/caelundas"],
      templateRuleNames: [
        "jupyter-notebook-application",
        "nestjs-command-project",
      ],
      workingDirectory,
    });
    expect(result.ok).toBe(true);
    expect(result.pluginResults).toHaveLength(5);
  });
});

function createPassingValidationResult(): ValidationPluginResult {
  return {
    checkedPaths: [],
    ok: true,
    pluginName: "test-plugin",
    violations: [],
  };
}

function createTemporaryDirectoryPath(): string {
  const temporaryDirectoryPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "conformetry-validation-"),
  );
  temporaryDirectoryPaths.push(temporaryDirectoryPath);
  return temporaryDirectoryPath;
}

function writeNxJsonConfiguration(workingDirectory: string): void {
  fs.writeFileSync(
    path.join(workingDirectory, "nx.json"),
    JSON.stringify({
      plugins: [
        {
          options: {
            templateRuleNamesByProjectTag: {
              "framework:nest-commander": ["nestjs-command-project"],
            },
          },
          plugin: "@jimmypaolini/conformetry-nx",
        },
      ],
    }),
    "utf8",
  );
}

function writeProjectMetadata(args: {
  projectMetadata: unknown;
  relativeProjectPath: string;
  workingDirectory: string;
}): void {
  const projectDirectoryPath = path.join(
    args.workingDirectory,
    args.relativeProjectPath,
  );
  fs.mkdirSync(projectDirectoryPath, { recursive: true });
  fs.writeFileSync(
    path.join(projectDirectoryPath, "project.json"),
    JSON.stringify(args.projectMetadata),
    "utf8",
  );
}
