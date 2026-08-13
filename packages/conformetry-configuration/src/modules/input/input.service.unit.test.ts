import { beforeEach, describe, expect, it, vi } from "vitest";

const { promptsMock } = vi.hoisted(() => {
  return {
    promptsMock:
      vi.fn<(request: unknown) => Promise<Record<string, unknown>>>(),
  };
});

vi.mock("prompts", () => {
  return {
    default: promptsMock,
  };
});

import { InputService } from "./input.service";

describe("inputService.resolveGeneratorInputs", () => {
  let service: InputService;

  beforeEach(() => {
    promptsMock.mockReset();
    service = new InputService();
  });

  it("parses option values through dedicated helpers", () => {
    expect(service.parseConfigurationPathOption("   ")).toBeUndefined();
    expect(
      service.parseConfigurationPathOption(
        " configuration/conformetry.config.ts ",
      ),
    ).toBe("configuration/conformetry.config.ts");
    expect(service.parseGeneratorNameOption(" react-component ")).toBe(
      "react-component",
    );
    expect(() => {
      service.parseGeneratorNameOption("   ");
    }).toThrow("Generator name must not be empty");
    expect(
      service.parseTargetDirectoryPathOption(" packages/lexico-components "),
    ).toBe("packages/lexico-components");
    expect(service.parseTargetDirectoryPathOption("   ")).toBeUndefined();
    expect(service.parseTargetDirectoryPathOption(undefined)).toBeUndefined();
    expect(
      service.parseProjectFilterOption("lexico, conformetry , ,"),
    ).toStrictEqual(["lexico", "conformetry"]);
    expect(service.parseProjectFilterOption("   ")).toBeUndefined();
    expect(service.parseProjectFilterOption(undefined)).toBeUndefined();
    expect(service.parseRuleFilterOption("json, markdown, ,")).toStrictEqual([
      "json",
      "markdown",
    ]);
    expect(service.parseRuleFilterOption("   ")).toBeUndefined();
    expect(service.parseRuleFilterOption(undefined)).toBeUndefined();
  });

  it("resolves provided values and prompts only for missing values", async () => {
    promptsMock.mockResolvedValueOnce({ value: "packages/conformetry" });

    const result = await service.resolveInputsFromValues({
      providedInputs: {
        config: " configuration/custom.config.ts ",
      },
      schema: {
        properties: {
          config: {
            type: "string",
          },
          projects: {
            description: "Comma-separated project paths",
            type: "string",
          },
        },
      },
    });

    expect(result).toStrictEqual({
      config: " configuration/custom.config.ts ",
      projects: "packages/conformetry",
    });
    expect(promptsMock).toHaveBeenCalledTimes(1);
  });

  it("returns direct schema-backed values without prompting", async () => {
    const result = await service.resolveGeneratorInputs({
      rawArguments: ["generate", "--project", "lexico"],
      schema: {
        properties: {
          project: {
            description: "Project name",
            type: "string",
          },
        },
        required: ["project"],
      },
    });

    expect(result).toStrictEqual({ project: "lexico" });
    expect(promptsMock).not.toHaveBeenCalled();
  });

  it("throws for invalid direct enum values", async () => {
    await expect(
      service.resolveGeneratorInputs({
        rawArguments: ["--type", "service"],
        schema: {
          properties: {
            type: {
              enum: ["application", "package", "tools"],
              type: "string",
            },
          },
          required: ["type"],
        },
      }),
    ).rejects.toThrow("type must be one of: application, package, tools");
  });

  it("prompts for missing required values", async () => {
    promptsMock.mockResolvedValueOnce({ value: "lexico-components" });

    const result = await service.resolveGeneratorInputs({
      rawArguments: [],
      schema: {
        properties: {
          project: {
            description: "Parent project name",
            type: "string",
          },
        },
        required: ["project"],
      },
    });

    expect(result).toStrictEqual({ project: "lexico-components" });
    expect(promptsMock).toHaveBeenCalledTimes(1);
  });

  it("throws when a required prompted value is missing", async () => {
    promptsMock.mockResolvedValueOnce({ value: "" });

    await expect(
      service.resolveGeneratorInputs({
        rawArguments: [],
        schema: {
          properties: {
            project: {
              description: "Parent project name",
              type: "string",
            },
          },
          required: ["project"],
        },
      }),
    ).rejects.toThrow("project is required");
  });

  it("skips missing optional values when prompting is disabled", async () => {
    const result = await service.resolveGeneratorInputs({
      promptWhenMissing: false,
      rawArguments: [],
      schema: {
        properties: {
          description: {
            type: "string",
          },
        },
      },
    });

    expect(result).toStrictEqual({});
    expect(promptsMock).not.toHaveBeenCalled();
  });

  it("validates prompted values against pattern constraints", async () => {
    promptsMock.mockResolvedValueOnce({ value: "BadName" });

    await expect(
      service.resolveGeneratorInputs({
        rawArguments: [],
        schema: {
          properties: {
            name: {
              pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
              type: "string",
            },
          },
          required: ["name"],
        },
      }),
    ).rejects.toThrow("name does not match pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$");
  });
});
