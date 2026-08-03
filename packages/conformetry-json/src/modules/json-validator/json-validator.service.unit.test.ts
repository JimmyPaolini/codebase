import { beforeEach, describe, expect, it, vi } from "vitest";

import { JsonValidatorService } from "./json-validator.service.js";

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

describe(JsonValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
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
