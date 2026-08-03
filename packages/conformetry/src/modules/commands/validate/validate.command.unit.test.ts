import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { JsonValidatorService } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorService } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorService } from "@jimmypaolini/conformetry-python";
import { TextValidatorService } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorService } from "@jimmypaolini/conformetry-typescript";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TestingModule } from "@nestjs/testing";

interface ValidationInputShape {
  readonly plugins: { readonly descriptor: { readonly name: string } }[];
  readonly projectPaths: string[];
  readonly templateRuleNames: string[];
  readonly workingDirectory: string;
}

const mockLoadConformetryConfiguration =
  vi.fn<(path: string) => Promise<unknown>>();
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
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
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
    mockRunValidation.mockResolvedValue({ ok: true, results: [] });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand(
      new ConfigurationService(),
      new ValidationService(),
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
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
      JSON.stringify({ ok: true, results: [] }, null, 2),
    );
  });

  it("uses local project and template rule selection when options are provided", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
        "react-component": {},
      },
    });
    mockRunValidation.mockResolvedValue({ ok: true });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand(
      new ConfigurationService(),
      new ValidationService(),
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
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
    mockRunValidation.mockResolvedValue({ failures: ["x"], ok: false });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand(
      new ConfigurationService(),
      new ValidationService(),
      new TypeScriptValidatorService(),
      new PythonValidatorService(),
      new MarkdownValidatorService(),
      new JsonValidatorService(),
      new TextValidatorService(),
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
    mockRunValidation.mockResolvedValue({ ok: true, results: [] });

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
            provide: TypeScriptValidatorService,
            useValue: new TypeScriptValidatorService(),
          },
          {
            provide: PythonValidatorService,
            useValue: new PythonValidatorService(),
          },
          {
            provide: MarkdownValidatorService,
            useValue: new MarkdownValidatorService(),
          },
          {
            provide: JsonValidatorService,
            useValue: new JsonValidatorService(),
          },
          {
            provide: TextValidatorService,
            useValue: new TextValidatorService(),
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
