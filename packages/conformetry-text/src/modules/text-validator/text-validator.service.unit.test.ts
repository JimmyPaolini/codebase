import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { TextValidatorService } from "./text-validator.service";

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

describe(TextValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  it("returns violations for missing paths when configurationPath is undefined", async () => {
    const textValidatorService = new TextValidatorService();
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-text-validator-"),
    );
    try {
      const existingFilePath = "existing.txt";
      await writeFile(
        path.join(temporaryDirectory, existingFilePath),
        "exists",
      );

      const result = await textValidatorService.validate({
        filePaths: [existingFilePath, "missing.txt"],
        workingDirectory: temporaryDirectory,
      });

      expect(result.checkedPaths).toStrictEqual([
        existingFilePath,
        "missing.txt",
      ]);
      expect(result.ok).toBe(false);
      expect(result.pluginName).toBe("text");
      expect(result.violations).toStrictEqual([
        `Missing text path ${path.resolve(temporaryDirectory, "missing.txt")}`,
      ]);
      expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("returns ok when all file paths exist and configurationPath is undefined", async () => {
    const textValidatorService = new TextValidatorService();
    const temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-text-validator-ok-"),
    );
    try {
      const existingFilePath = "existing.txt";
      await writeFile(
        path.join(temporaryDirectory, existingFilePath),
        "exists",
      );

      const result = await textValidatorService.validate({
        filePaths: [existingFilePath],
        workingDirectory: temporaryDirectory,
      });

      expect(result.checkedPaths).toStrictEqual([existingFilePath]);
      expect(result.ok).toBe(true);
      expect(result.pluginName).toBe("text");
      expect(result.violations).toStrictEqual([]);
      expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });

  it("reports missing template lines with original template line numbers", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.txt",
          instance: "first\nsecond\n",
          instanceFilePath: "src/example.txt",
          renderedTemplate: "first\nsecond\nthird\n",
          templateFilePath: "templates/example.txt",
        },
      ],
      violations: [],
    });

    const textValidatorService = new TextValidatorService();

    const result = await textValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.txt"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      "src/example.txt: Missing line at template line 3: third (template: templates/example.txt)",
    );
  });

  it("treats line order as flexible but still enforces duplicate line counts", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.txt",
          instance: "beta\nalpha\n",
          instanceFilePath: "src/example.txt",
          renderedTemplate: "alpha\nbeta\nalpha\n",
          templateFilePath: "templates/example.txt",
        },
      ],
      violations: [],
    });

    const textValidatorService = new TextValidatorService();

    const result = await textValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.txt"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      "src/example.txt: Missing line at template line 3: alpha (template: templates/example.txt)",
    );
  });

  it("forwards templateRuleNames and includes payload violations", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.txt",
          instance: "first\nsecond\n",
          instanceFilePath: "src/example.txt",
          renderedTemplate: "first\nsecond\n",
          templateFilePath: "templates/example.txt",
        },
      ],
      violations: ["Configuration parse failure"],
    });

    const textValidatorService = new TextValidatorService();
    const workingDirectory = process.cwd();
    const filePaths = ["src/example.txt"];

    const result = await textValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths,
      templateRuleNames: ["text-rule"],
      workingDirectory,
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      fileExtensions: [".txt"],
      filePaths,
      templateRuleNames: ["text-rule"],
      workingDirectory,
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toStrictEqual(["Configuration parse failure"]);
  });
});
