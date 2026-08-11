import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import * as jsoncParser from "jsonc-parser";
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
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes the expected plugin descriptor", () => {
    const jsonValidatorService = new JsonValidatorService();

    expect(jsonValidatorService.pluginDescriptor).toStrictEqual({
      description: "Checks JSON and JSONC structural conformance",
      fileExtensions: [".json", ".jsonc"],
      name: "json",
    });
  });

  it("reports missing file paths when configurationPath is undefined", async () => {
    const temporaryDirectoryPath = await mkdtemp(
      path.join(os.tmpdir(), "json-validator-"),
    );
    const existingRelativePath = "existing.json";
    const missingRelativePath = "missing.json";

    await writeFile(
      path.join(temporaryDirectoryPath, existingRelativePath),
      '{"enabled":true}',
      "utf8",
    );

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      filePaths: [existingRelativePath, missingRelativePath],
      workingDirectory: temporaryDirectoryPath,
    });

    await rm(temporaryDirectoryPath, { force: true, recursive: true });

    expect(result.checkedPaths).toStrictEqual([
      existingRelativePath,
      missingRelativePath,
    ]);
    expect(result.ok).toBe(false);
    expect(result.pluginName).toBe("json");
    expect(result.violations).toStrictEqual([
      `Missing JSON path ${path.resolve(temporaryDirectoryPath, missingRelativePath)}`,
    ]);
  });

  it("returns ok when all file paths exist and configurationPath is undefined", async () => {
    const temporaryDirectoryPath = await mkdtemp(
      path.join(os.tmpdir(), "json-validator-"),
    );
    const existingRelativePath = "existing.json";

    await writeFile(
      path.join(temporaryDirectoryPath, existingRelativePath),
      '{"enabled":true}',
      "utf8",
    );

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      filePaths: [existingRelativePath],
      workingDirectory: temporaryDirectoryPath,
    });

    await rm(temporaryDirectoryPath, { force: true, recursive: true });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
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

  it("reports primitive value mismatches and appends payload violations", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance: '{"enabled":false}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"enabled":true}',
          templateFilePath: "templates/example.json",
        },
      ],
      violations: ["invalid template mapping"],
    });

    const jsonValidatorService = new JsonValidatorService();

    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.json: Expected true at "enabled" but found false (template: templates/example.json)',
    );
    expect(result.violations).toContain("invalid template mapping");
  });

  it("reports missing primitive array entries", async () => {
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

    expect(result.violations).toContain(
      'src/example.json: Missing required array value "core" at "tags" (template: templates/example.json)',
    );
  });

  it("reports missing array structures for object templates when arrays are empty", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance: '{"items":[]}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"items":[{"name":"required"}]}',
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

    expect(result.violations).toContain(
      'src/example.json: Missing required array structure at "items" (template: templates/example.json)',
    );
  });

  it("picks the closest array candidate when validating nested object templates", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance:
            '{"items":[{"name":"not-matching"},{"name":"required","status":"active"}]}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"items":[{"name":"required","status":"active"}]}',
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

  it("retains the first array candidate when later candidates are not closer", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance:
            '{"items":[{"name":"required","status":"active"},{"name":"not-matching"}]}',
          instanceFilePath: "src/example.json",
          renderedTemplate: '{"items":[{"name":"required","status":"active"}]}',
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

  it("treats undefined parsed object values as null through nullish fallback", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.json",
          instance: "{}",
          instanceFilePath: "src/example.json",
          renderedTemplate: "{}",
          templateFilePath: "templates/example.json",
        },
      ],
      violations: [],
    });

    const parseSpy = vi.spyOn(jsoncParser, "parse");
    parseSpy
      .mockReturnValueOnce({ value: undefined })
      .mockReturnValueOnce({ value: undefined });

    const jsonValidatorService = new JsonValidatorService();
    const result = await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
  });

  it("forwards templateRuleNames to prepareTemplateValidationPayload", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [],
      violations: [],
    });

    const jsonValidatorService = new JsonValidatorService();
    await jsonValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.json"],
      templateRuleNames: ["json-basic"],
      workingDirectory: "/workspace",
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      fileExtensions: [".json", ".jsonc"],
      filePaths: ["src/example.json"],
      templateRuleNames: ["json-basic"],
      workingDirectory: "/workspace",
    });
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
