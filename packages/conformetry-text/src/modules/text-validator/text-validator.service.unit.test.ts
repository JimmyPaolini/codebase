import { beforeEach, describe, expect, it, vi } from "vitest";

import { TEXT_VALIDATOR_PLUGIN_DESCRIPTOR } from "./text-validator.constants";
import { TextValidatorService } from "./text-validator.service";

const { prepareTemplateValidationPayloadMock } = vi.hoisted(() => {
  return {
    prepareTemplateValidationPayloadMock: vi.fn(),
  };
});

const { accessMock } = vi.hoisted(() => {
  return {
    accessMock: vi.fn(),
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    prepareTemplateValidationPayload: prepareTemplateValidationPayloadMock,
  };
});

vi.mock("node:fs/promises", () => {
  return {
    access: accessMock,
  };
});

describe(TextValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
    accessMock.mockReset();
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

  it("validates file path existence when no configuration path is provided", async () => {
    accessMock.mockImplementation(async (pathName: string) => {
      if (pathName.endsWith("missing.txt")) {
        throw new Error("missing file");
      }

      await Promise.resolve();
    });

    const textValidatorService = new TextValidatorService();

    const result = await textValidatorService.validate({
      filePaths: ["exists.txt", "missing.txt"],
      workingDirectory: "/workspace",
    });

    expect(result).toStrictEqual({
      checkedPaths: ["exists.txt", "missing.txt"],
      ok: false,
      pluginName: TEXT_VALIDATOR_PLUGIN_DESCRIPTOR.name,
      violations: ["Missing text path /workspace/missing.txt"],
    });
    expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
    expect(accessMock).toHaveBeenCalledTimes(2);
  });

  it("returns ok when all provided file paths exist", async () => {
    accessMock.mockResolvedValue(undefined);

    const textValidatorService = new TextValidatorService();

    const result = await textValidatorService.validate({
      filePaths: ["exists.txt"],
      workingDirectory: "/workspace",
    });

    expect(result).toStrictEqual({
      checkedPaths: ["exists.txt"],
      ok: true,
      pluginName: TEXT_VALIDATOR_PLUGIN_DESCRIPTOR.name,
      violations: [],
    });
    expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
  });
});
