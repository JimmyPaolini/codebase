import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarkdownValidatorService } from "./markdown-validator.service";

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

describe(MarkdownValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  it("reports heading-depth AST deviations even when heading text is unchanged", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "README.md",
          instance: "## Overview\n",
          instanceFilePath: "src/README.md",
          renderedTemplate: "# Overview\n",
          templateFilePath: "templates/README.md",
        },
      ],
      violations: [],
    });

    const markdownValidatorService = new MarkdownValidatorService();

    const result = await markdownValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/README.md"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/README.md: Missing markdown heading: "Overview" (template: templates/README.md)',
    );
  });

  it("allows additional markdown nodes when template nodes are still present", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "README.md",
          instance:
            "# Overview\n\nCore content.\n\n## Additional Details\n\nSupplemental content.\n",
          instanceFilePath: "src/README.md",
          renderedTemplate: "# Overview\n\nCore content.\n",
          templateFilePath: "templates/README.md",
        },
      ],
      violations: [],
    });

    const markdownValidatorService = new MarkdownValidatorService();

    const result = await markdownValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/README.md"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
  });
});
