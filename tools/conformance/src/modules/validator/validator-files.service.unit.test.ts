import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { workspaceRoot } from "@nx/devkit";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";

import { ValidatorFilesService } from "./validator-files.service";
import { ValidatorJsonService } from "./validator-json.service";
import { ValidatorMarkdownService } from "./validator-markdown.service";
import { ValidatorPythonService } from "./validator-python.service";
import { ValidatorTextService } from "./validator-text.service";
import { ValidatorTypescriptService } from "./validator-typescript.service";

import type { DeepMocked } from "@golevelup/ts-vitest";

describe(ValidatorFilesService, () => {
  let service: ValidatorFilesService;
  let validatorJsonService: DeepMocked<ValidatorJsonService>;
  let validatorMarkdownService: DeepMocked<ValidatorMarkdownService>;
  let validatorPythonService: DeepMocked<ValidatorPythonService>;
  let validatorTextService: DeepMocked<ValidatorTextService>;
  let validatorTypescriptService: DeepMocked<ValidatorTypescriptService>;
  const temporaryDirectories: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ValidatorFilesService,
        GeneratorService,
        {
          provide: ValidatorJsonService,
          useValue: createMock<ValidatorJsonService>(),
        },
        {
          provide: ValidatorMarkdownService,
          useValue: createMock<ValidatorMarkdownService>(),
        },
        {
          provide: ValidatorPythonService,
          useValue: createMock<ValidatorPythonService>(),
        },
        {
          provide: ValidatorTextService,
          useValue: createMock<ValidatorTextService>(),
        },
        {
          provide: ValidatorTypescriptService,
          useValue: createMock<ValidatorTypescriptService>(),
        },
      ],
    }).compile();

    service = await module.resolve(ValidatorFilesService);
    validatorJsonService = await module.resolve(ValidatorJsonService);
    validatorMarkdownService = await module.resolve(ValidatorMarkdownService);
    validatorPythonService = await module.resolve(ValidatorPythonService);
    validatorTextService = await module.resolve(ValidatorTextService);
    validatorTypescriptService = await module.resolve(
      ValidatorTypescriptService,
    );

    Object.assign(service as object, {
      validatorPythonService,
      validatorTypescriptService,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    while (temporaryDirectories.length > 0) {
      const temporaryDirectory = temporaryDirectories.pop();
      if (temporaryDirectory !== undefined) {
        fs.rmSync(temporaryDirectory, { force: true, recursive: true });
      }
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("stringifies directory and file errors", () => {
    const output = service.stringifyConformanceErrors([
      {
        directoryName: "applications/example",
        results: [
          {
            errors: [
              {
                actual: "actual value",
                errorType: "code",
                expected: "expected value",
                fix: "fix message",
                instanceColumn: 2,
                instanceLine: 4,
                language: "markdown",
                message: "Missing code block",
                templateColumn: 5,
                templateLine: 8,
              },
              {
                errorType: "code",
                fix: "fix message",
                instancePath: "instance.path",
                language: "json",
                message: "Missing field",
                templatePath: "template.path",
              },
            ],
            filename: "example.md",
            instanceFilePath: path.join(
              workspaceRoot,
              "applications/example/example.md",
            ),
            templateFilePath: path.join(
              workspaceRoot,
              "tools/conformance/templates/example.md",
            ),
          },
        ],
      },
    ]);

    expect(output).toContain(
      "Conformance validation failed — 1 directory with errors.",
    );
    expect(output).toContain("1. directory: applications/example");
    expect(output).toContain("1. file: example.md");
    expect(output).toContain("Instance: Line 4, Column 2");
    expect(output).toContain("Template: Line 8, Column 5");
    expect(output).toContain('Instance: JSON path "instance.path"');
    expect(output).toContain('Template: JSON path "template.path"');
    expect(output).toContain("Expected: `expected value`");
    expect(output).toContain("Actual  : `actual value`");
    expect(output).toContain("Fix     : fix message");
  });

  it("formats location lines without column and with template json path only", () => {
    const output = service.stringifyConformanceErrors([
      {
        directoryName: "applications/example",
        results: [
          {
            errors: [
              {
                errorType: "code",
                fix: "fix message",
                instanceLine: 7,
                language: "markdown",
                message: "Line-only location",
                templatePath: "template.path.only",
              },
            ],
            filename: "example.md",
            instanceFilePath: path.join(
              workspaceRoot,
              "applications/example/example.md",
            ),
            templateFilePath: path.join(
              workspaceRoot,
              "tools/conformance/templates/example.md",
            ),
          },
        ],
      },
    ]);

    expect(output).toContain("Instance: Line 7");
    expect(output).toContain('Template: JSON path "template.path.only"');
  });

  it("omits location lines when neither line nor jsonPath exists", () => {
    const output = service.stringifyConformanceErrors([
      {
        directoryName: "applications/example",
        results: [
          {
            errors: [
              {
                errorType: "code",
                fix: "fix message",
                language: "markdown",
                message: "No location metadata",
              },
            ],
            filename: "example.md",
            instanceFilePath: path.join(
              workspaceRoot,
              "applications/example/example.md",
            ),
            templateFilePath: path.join(
              workspaceRoot,
              "tools/conformance/templates/example.md",
            ),
          },
        ],
      },
    ]);

    expect(output).toContain("No location metadata");
    expect(output).not.toContain("Instance: Line");
    expect(output).not.toContain("Template: Line");
    expect(output).not.toContain('JSON path "');
  });

  it("validates a directory using overrides and preserves unknown placeholders", () => {
    const instanceDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-instance-"),
    );
    const templateDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-template-"),
    );
    temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

    fs.writeFileSync(
      path.join(instanceDirectoryPath, "pyproject.toml"),
      'description = "Example project"\n',
    );
    fs.mkdirSync(path.join(templateDirectoryPath, "ignored"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(templateDirectoryPath, "__nameKebabCase__-__unknown__.md"),
      "# Title\n",
    );
    fs.writeFileSync(
      path.join(templateDirectoryPath, "ignored", "ignored.md"),
      "ignored\n",
    );

    const validateInstanceFileSpy = vi.spyOn(service, "validateInstanceFile");
    validateInstanceFileSpy.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    const result = service.validateInstanceDirectory({
      descriptionOverride: "Overridden description",
      instanceDirectoryPath,
      nameOverride: "Example Project",
      templateDirectoryPath,
    });

    expect(result.directoryName).toBe("Example Project");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.filename).toBe("example-project-__unknown__.md");

    expect(validateInstanceFileSpy).toHaveBeenCalledTimes(1);
    expect(validateInstanceFileSpy.mock.calls[0]?.[0]).toMatchObject({
      data: {
        description: "Overridden description",
        name: "Example Project",
        nameCamelCase: "exampleProject",
        nameKebabCase: "example-project",
        namePascalCase: "ExampleProject",
        nameSnakeCase: "example_project",
      },
      instanceFilePath: path.join(
        instanceDirectoryPath,
        "example-project-__unknown__.md",
      ),
      templateFilePath: path.join(
        templateDirectoryPath,
        "__nameKebabCase__-__unknown__.md",
      ),
    });
  });

  it("returns a missing-file error when the instance file is absent", () => {
    const instanceDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-missing-"),
    );
    const templateDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-template-"),
    );
    temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

    const instanceFilePath = path.join(instanceDirectoryPath, "missing.md");
    const templateFilePath = path.join(templateDirectoryPath, "missing.md");
    fs.writeFileSync(templateFilePath, "# Title\n");

    const result = service.validateInstanceFile({
      data: {},
      instanceFilePath,
      templateFilePath,
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      errorType: "file",
      message: `Missing file: ${instanceFilePath}`,
    });
    expect(result.errors[0]?.fix).toContain(templateFilePath);
  });

  it.each([
    ["json", ".json", "json"],
    ["markdown", ".md", "markdown"],
    ["typescript", ".ts", "typescript"],
    ["python", ".py", "python"],
    ["text", ".txt", "text"],
  ] as const)(
    "dispatches to the %s validator",
    (_, extension, validatorType) => {
      const instanceDirectoryPath = fs.mkdtempSync(
        path.join(os.tmpdir(), "conformance-validator-files-dispatch-"),
      );
      const templateDirectoryPath = fs.mkdtempSync(
        path.join(
          os.tmpdir(),
          "conformance-validator-files-dispatch-template-",
        ),
      );
      temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

      const instanceFilePath = path.join(
        instanceDirectoryPath,
        `value${extension}`,
      );
      const templateFilePath = path.join(
        templateDirectoryPath,
        `value${extension}`,
      );
      fs.writeFileSync(instanceFilePath, "content\n");
      fs.writeFileSync(templateFilePath, "content\n");

      const validatorMock = vi
        .fn<
          (arguments_: unknown) => {
            errors: { errorType: string; fix: string; message: string }[];
          }
        >()
        .mockReturnValue({
          errors: [{ errorType: "code", fix: "fix", message: "message" }],
        });

      switch (validatorType) {
        case "json": {
          Object.assign(validatorJsonService as object, {
            validateJsonConformance: validatorMock,
          });

          break;
        }
        case "markdown": {
          Object.assign(validatorMarkdownService as object, {
            validateMarkdownConformance: validatorMock,
          });

          break;
        }
        case "python": {
          Object.assign(validatorPythonService as object, {
            validatePythonConformance: validatorMock,
          });

          break;
        }
        case "text": {
          Object.assign(validatorTextService as object, {
            validateTextConformance: validatorMock,
          });

          break;
        }
        case "typescript": {
          Object.assign(validatorTypescriptService as object, {
            validateTypescriptConformance: validatorMock,
          });

          break;
        }
      }

      const result = service.validateInstanceFile({
        data: { value: "example" },
        instanceFilePath,
        templateFilePath,
      });

      expect(validatorMock).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        errors: [{ errorType: "code", fix: "fix", message: "message" }],
        instanceFilePath,
        templateFilePath,
      });
    },
  );

  it("uses empty description when pyproject exists without description", () => {
    const instanceDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-no-description-"),
    );
    const templateDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-template-"),
    );
    temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

    fs.writeFileSync(
      path.join(instanceDirectoryPath, "pyproject.toml"),
      '[project]\nname = "sample"\n',
    );
    fs.writeFileSync(
      path.join(templateDirectoryPath, "__nameKebabCase__.txt"),
      "template\n",
    );

    const validateInstanceFileSpy = vi.spyOn(service, "validateInstanceFile");
    validateInstanceFileSpy.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    service.validateInstanceDirectory({
      instanceDirectoryPath,
      nameOverride: "Sample Name",
      templateDirectoryPath,
    });

    expect(validateInstanceFileSpy).toHaveBeenCalledTimes(1);
    expect(validateInstanceFileSpy.mock.calls[0]?.[0]).toMatchObject({
      data: {
        description: "",
      },
    });
  });

  it("uses empty description when pyproject.toml does not exist", () => {
    const instanceDirectoryPath = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "conformance-validator-files-no-pyproject-present-",
      ),
    );
    const templateDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-template-"),
    );
    temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

    fs.writeFileSync(
      path.join(templateDirectoryPath, "__nameKebabCase__.txt"),
      "template\n",
    );

    const validateInstanceFileSpy = vi.spyOn(service, "validateInstanceFile");
    validateInstanceFileSpy.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    service.validateInstanceDirectory({
      instanceDirectoryPath,
      nameOverride: "Sample Name",
      templateDirectoryPath,
    });

    expect(validateInstanceFileSpy).toHaveBeenCalledTimes(1);
    expect(validateInstanceFileSpy.mock.calls[0]?.[0]).toMatchObject({
      data: {
        description: "",
      },
    });
  });

  it("uses description from pyproject when no description override is provided", () => {
    const instanceDirectoryPath = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "conformance-validator-files-description-present-",
      ),
    );
    const templateDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-template-"),
    );
    temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

    fs.writeFileSync(
      path.join(instanceDirectoryPath, "pyproject.toml"),
      'description = "Loaded from pyproject"\n',
    );
    fs.writeFileSync(
      path.join(templateDirectoryPath, "__nameKebabCase__.txt"),
      "template\n",
    );

    const validateInstanceFileSpy = vi.spyOn(service, "validateInstanceFile");
    validateInstanceFileSpy.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    service.validateInstanceDirectory({
      instanceDirectoryPath,
      nameOverride: "Sample Name",
      templateDirectoryPath,
    });

    expect(validateInstanceFileSpy).toHaveBeenCalledTimes(1);
    expect(validateInstanceFileSpy.mock.calls[0]?.[0]).toMatchObject({
      data: {
        description: "Loaded from pyproject",
      },
    });
  });

  it("rethrows non-ENOENT file read errors", () => {
    const instanceDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-rethrow-instance-"),
    );
    const templateDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-rethrow-template-"),
    );
    temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

    const instanceFilePath = path.join(instanceDirectoryPath, "value.md");
    const templateFilePath = path.join(templateDirectoryPath, "value.md");
    fs.writeFileSync(instanceFilePath, "instance\n");
    fs.writeFileSync(templateFilePath, "template\n");

    const originalReadFileSync = fs.readFileSync;
    const readSpy = vi.spyOn(fs, "readFileSync");
    readSpy.mockImplementation((filePath, options) => {
      if (filePath === templateFilePath) {
        throw new Error("Permission denied");
      }
      return originalReadFileSync.call(fs, filePath, options);
    });

    expect(() => {
      service.validateInstanceFile({
        data: {},
        instanceFilePath,
        templateFilePath,
      });
    }).toThrow("Permission denied");
  });

  it("uses pluralized header when multiple directories have errors", () => {
    const output = service.stringifyConformanceErrors([
      {
        directoryName: "applications/alpha",
        results: [
          {
            errors: [
              {
                errorType: "code",
                fix: "fix",
                message: "first",
              },
            ],
            filename: "alpha.md",
            instanceFilePath: "/workspace/applications/alpha/alpha.md",
            templateFilePath: "/workspace/templates/alpha.md",
          },
        ],
      },
      {
        directoryName: "applications/beta",
        results: [
          {
            errors: [
              {
                errorType: "code",
                fix: "fix",
                message: "second",
              },
            ],
            filename: "beta.md",
            instanceFilePath: "/workspace/applications/beta/beta.md",
            templateFilePath: "/workspace/templates/beta.md",
          },
        ],
      },
    ]);

    expect(output).toContain(
      "Conformance validation failed — 2 directories with errors.",
    );
  });

  it("returns null when no directory contains errors", () => {
    const result = service.stringifyConformanceErrors([
      {
        directoryName: "applications/alpha",
        results: [
          {
            errors: [],
            filename: "alpha.md",
            instanceFilePath: "/workspace/applications/alpha/alpha.md",
            templateFilePath: "/workspace/templates/alpha.md",
          },
        ],
      },
      {
        directoryName: "applications/beta",
        results: [
          {
            errors: [],
            filename: "beta.md",
            instanceFilePath: "/workspace/applications/beta/beta.md",
            templateFilePath: "/workspace/templates/beta.md",
          },
        ],
      },
    ]);

    expect(result).toBeNull();
  });

  it("uses instance directory basename when nameOverride is undefined", () => {
    const instanceDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-basename-name-"),
    );
    const templateDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-files-template-"),
    );
    temporaryDirectories.push(instanceDirectoryPath, templateDirectoryPath);

    fs.writeFileSync(
      path.join(templateDirectoryPath, "__nameKebabCase__.txt"),
      "template\n",
    );

    const result = service.validateInstanceDirectory({
      instanceDirectoryPath,
      templateDirectoryPath,
    });

    expect(result.directoryName).toBe(path.basename(instanceDirectoryPath));
  });
});
