import { beforeEach, describe, expect, it, vi } from "vitest";

import { TypeScriptValidatorService } from "./typescript-validator.service.js";

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

describe(TypeScriptValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  it("reports import specifier AST deviations when identifiers are changed", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.ts",
          instance:
            'import { beta } from "./dependency.js";\nexport const selected = beta;\n',
          instanceFilePath: "src/example.ts",
          renderedTemplate:
            'import { alpha } from "./dependency.js";\nexport const selected = alpha;\n',
          templateFilePath: "templates/example.ts",
        },
      ],
      violations: [],
    });

    const typeScriptValidatorService = new TypeScriptValidatorService();

    const result = await typeScriptValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.ts"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.ts: Missing ImportSpecifier "alpha" (template: templates/example.ts)',
    );
  });

  it("reports schema-preserving but AST-different initializer shapes", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.ts",
          instance: "const selected = (sourceValue);\n",
          instanceFilePath: "src/example.ts",
          renderedTemplate: "const selected = sourceValue;\n",
          templateFilePath: "templates/example.ts",
        },
      ],
      violations: [],
    });

    const typeScriptValidatorService = new TypeScriptValidatorService();

    const result = await typeScriptValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.ts"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.ts: Missing Identifier "sourceValue" (template: templates/example.ts)',
    );
  });
});
