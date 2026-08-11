import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JsonValidatorService } from "./json-validator.service";

const { prepareTemplateValidationPayloadMock } = vi.hoisted(() => {
  return {
    prepareTemplateValidationPayloadMock: vi.fn(),
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    prepareTemplateValidationPayload: prepareTemplateValidationPayloadMock,
  };
});

describe(JsonValidatorService, () => {
  const temporaryDirectoryPaths: string[] = [];

  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  afterEach(async () => {
    await Promise.all(
      temporaryDirectoryPaths.map(async (temporaryDirectoryPath) => {
        await rm(temporaryDirectoryPath, { force: true, recursive: true });
      }),
    );
    temporaryDirectoryPaths.length = 0;
  });

  it("validates path existence when no configuration path is provided", async () => {
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-json-validator-"),
    );
    temporaryDirectoryPaths.push(temporaryDirectoryPath);

    await writeFile(
      path.join(temporaryDirectoryPath, "existing.json"),
      '{"name":"existing"}',
      "utf8",
    );

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      filePaths: ["existing.json", "missing.json"],
      workingDirectory: temporaryDirectoryPath,
    });

    expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.violations).toStrictEqual([
      `Missing JSON path ${path.resolve(temporaryDirectoryPath, "missing.json")}`,
    ]);
  });

  it("returns a successful validation when all required paths exist", async () => {
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-json-validator-"),
    );
    temporaryDirectoryPaths.push(temporaryDirectoryPath);

    await writeFile(
      path.join(temporaryDirectoryPath, "existing.json"),
      '{"name":"existing"}',
      "utf8",
    );

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      filePaths: ["existing.json"],
      workingDirectory: temporaryDirectoryPath,
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
  });

  it("forwards templateRuleNames and returns payload violations", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [],
      violations: ["Invalid template reference"],
    });

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      templateRuleNames: ["json-structure-rule"],
      workingDirectory: process.cwd(),
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      fileExtensions: [".json", ".jsonc"],
      filePaths: ["src/example.json"],
      templateRuleNames: ["json-structure-rule"],
      workingDirectory: process.cwd(),
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toStrictEqual(["Invalid template reference"]);
  });

  it("reports missing required nested keys from template documents", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance: '{"metadata":{},"enabled":true}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"metadata":{"version":1},"enabled":true}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();

    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.json: Missing required key "metadata.version" (template: templates/example.json)',
    );
  });

  it("reports primitive mismatches at nested array paths", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance:
            '{"items":[{"id":2,"metadata":{"version":null}}],"enabled":true}',
          instanceFilePath: "src/example.json",
          renderedTemplate:
            '{"items":[{"id":1,"metadata":{"version":null}}],"enabled":true}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.json: Expected 1 at "items[0].id" but found 2 (template: templates/example.json)',
    );
  });

  it("reports missing primitive array values", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance: '{"tags":["extended"]}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"tags":["core"]}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.json: Missing required array value "core" at "tags" (template: templates/example.json)',
    );
  });

  it("reports missing object array structures when the instance array is empty", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance: '{"rules":[]}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"rules":[{"name":"required"}]}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.json: Missing required array structure at "rules" (template: templates/example.json)',
    );
  });

  it("chooses the best matching array candidate when multiple objects exist", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance:
            '{"rules":[{"name":"required"},{"name":"required","enabled":true}]}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"rules":[{"name":"required","enabled":true}]}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
  });

  it("keeps the first array candidate when later candidates are not better", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance: '{"rules":[{"name":"required"},{"name":"optional"}]}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"rules":[{"name":"required","enabled":true}]}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.json: Missing required key "rules[0].enabled" (template: templates/example.json)',
    );
  });

  it("allows additional object keys and array values when template requirements are preserved", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance:
            '{"extra":"value","tags":["core","extended"],"name":"tool"}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"name":"tool","tags":["core"]}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();

    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
  });
});
