import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLoadConformetryConfiguration =
  vi.fn<(path: string) => Promise<unknown>>();
const mockRunValidation = vi.fn<(input: unknown) => Promise<unknown>>();
const mockLoggerLog = vi.fn<(message: unknown) => void>();
const mockResolveTemplateRuleRouting = vi.fn<(input: unknown) => unknown>();

const typeScriptPlugin = { descriptor: { name: "typescript" } };
const pythonPlugin = { descriptor: { name: "python" } };
const markdownPlugin = { descriptor: { name: "markdown" } };
const jsonPlugin = { descriptor: { name: "json" } };
const textPlugin = { descriptor: { name: "text" } };

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

vi.mock("@jimmypaolini/conformetry-typescript", () => {
  return {
    createTypeScriptValidatorPlugin: () => typeScriptPlugin,
  };
});

vi.mock("@jimmypaolini/conformetry-python", () => {
  return {
    createPythonValidatorPlugin: () => pythonPlugin,
  };
});

vi.mock("@jimmypaolini/conformetry-markdown", () => {
  return {
    createMarkdownValidatorPlugin: () => markdownPlugin,
  };
});

vi.mock("@jimmypaolini/conformetry-json", () => {
  return {
    createJsonValidatorPlugin: () => jsonPlugin,
  };
});

vi.mock("@jimmypaolini/conformetry-text", () => {
  return {
    createTextValidatorPlugin: () => textPlugin,
  };
});

vi.mock("@jimmypaolini/conformetry-validation", () => {
  return {
    ValidationService: class ValidationService {
      runValidation = mockRunValidation;
    },
  };
});

vi.mock("@jimmypaolini/conformetry-nx", () => {
  return {
    resolveTemplateRuleRouting: mockResolveTemplateRuleRouting,
  };
});

describe("validateCommand", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("parses config, project, and rule options", async () => {
    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand();

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
    mockResolveTemplateRuleRouting.mockReturnValue({
      projectPaths: ["packages/conformetry"],
      templateRuleNames: ["nestjs-service-module"],
    });
    mockRunValidation.mockResolvedValue({ ok: true, results: [] });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand();

    await command.run([], {});

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/conformetry.config.ts",
    );
    expect(mockRunValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: [
          typeScriptPlugin,
          pythonPlugin,
          markdownPlugin,
          jsonPlugin,
          textPlugin,
        ],
        projectPaths: ["packages/conformetry"],
        templateRuleNames: ["nestjs-service-module"],
        workingDirectory: process.cwd(),
      }),
    );
    expect(mockLoggerLog).toHaveBeenCalledWith(
      JSON.stringify({ ok: true, results: [] }, null, 2),
    );
  });

  it("filters validators and project paths when rules and projects are provided", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({
      generators: {
        "nestjs-service-module": {},
        "react-component": {},
      },
    });
    mockResolveTemplateRuleRouting.mockReturnValue({
      projectPaths: ["packages/conformetry-json"],
      templateRuleNames: ["react-component"],
    });
    mockRunValidation.mockResolvedValue({ ok: true });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand();

    await command.run([], {
      config: "configuration/custom.config.ts",
      projects: ["packages/conformetry", "packages/conformetry-json"],
      rules: ["markdown", "json"],
    });

    expect(mockLoadConformetryConfiguration).toHaveBeenCalledWith(
      "configuration/custom.config.ts",
    );
    expect(mockResolveTemplateRuleRouting).toHaveBeenCalledWith({
      configuredTemplateRuleNames: ["nestjs-service-module", "react-component"],
      projectSelectors: ["packages/conformetry", "packages/conformetry-json"],
      workingDirectory: process.cwd(),
    });
    expect(mockRunValidation).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: [markdownPlugin, jsonPlugin],
        projectPaths: ["packages/conformetry-json"],
        templateRuleNames: ["react-component"],
      }),
    );
  });

  it("throws when validation result is not ok", async () => {
    mockLoadConformetryConfiguration.mockResolvedValue({ generators: {} });
    mockResolveTemplateRuleRouting.mockReturnValue({
      projectPaths: [process.cwd()],
      templateRuleNames: [],
    });
    mockRunValidation.mockResolvedValue({ failures: ["x"], ok: false });

    const { ValidateCommand } = await import("./validate.command.js");
    const command = new ValidateCommand();

    await expect(command.run([], {})).rejects.toThrow("Validation failed");
  });
});
