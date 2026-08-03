import { beforeEach, describe, expect, it, vi } from "vitest";

import { TextValidatorService } from "./text-validator.service.js";

const { prepareTemplateValidationPayloadMock } = vi.hoisted(() => {
  return {
    prepareTemplateValidationPayloadMock: vi.fn(),
  };
});

vi.mock("@jimmypaolini/conformetry-validation", () => {
  return {
    prepareTemplateValidationPayload: prepareTemplateValidationPayloadMock,
  };
});

describe(TextValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
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
});
