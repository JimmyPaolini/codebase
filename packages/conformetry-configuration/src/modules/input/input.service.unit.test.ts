import { Test } from "@nestjs/testing";
import prompts from "prompts";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { InputOptionsService } from "./input-options.service";
import { InputPromptingService } from "./input-prompting.service";
import { InputSchemaService } from "./input-schema.service";
import { InputService } from "./input.service";

// Mocked at the module boundary so the interactive path is exercised without
// a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

const REQUIRED_NAME_SCHEMA = {
  properties: { name: { description: "Module name", type: "string" } },
  required: ["name"],
};

describe(InputService, () => {
  let service: InputService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InputOptionsService,
        InputPromptingService,
        InputSchemaService,
        InputService,
      ],
    }).compile();

    service = await module.resolve(InputService);
  });

  beforeEach(() => {
    promptRunner.mockReset();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("option parsing", () => {
    it("treats blank optional options as absent", () => {
      expect(service.parseOptionalOption("  ")).toBeUndefined();
      expect(service.parseOptionalOption(undefined)).toBeUndefined();
      expect(service.parseOptionalOption(" path ")).toBe("path");
    });

    it("rejects a blank required option", () => {
      expect(() =>
        service.parseRequiredOption({ optionName: "generator", value: "  " }),
      ).toThrow("generator must not be empty");
    });

    it("splits comma-delimited filters and drops empties", () => {
      expect(service.parseCommaDelimitedOption("a, ,b ")).toStrictEqual([
        "a",
        "b",
      ]);
      expect(service.parseCommaDelimitedOption(" , ")).toBeUndefined();
      expect(service.parseCommaDelimitedOption(undefined)).toBeUndefined();
    });
  });

  describe("resolveGeneratorInputs", () => {
    it("reads a schema-backed flag from raw arguments", async () => {
      const inputs = await service.resolveGeneratorInputs({
        promptWhenMissing: false,
        rawArguments: ["generate", "--name", "my-widget"],
        schema: REQUIRED_NAME_SCHEMA,
      });

      expect(inputs).toStrictEqual({ name: "my-widget" });
    });

    it("reads the inline --flag=value form", async () => {
      const inputs = await service.resolveGeneratorInputs({
        promptWhenMissing: false,
        rawArguments: ["--name=my-widget"],
        schema: REQUIRED_NAME_SCHEMA,
      });

      expect(inputs).toStrictEqual({ name: "my-widget" });
    });

    it("throws instead of prompting when a required value is missing", async () => {
      await expect(
        service.resolveGeneratorInputs({
          promptWhenMissing: false,
          rawArguments: [],
          schema: REQUIRED_NAME_SCHEMA,
        }),
      ).rejects.toThrow("name is required");
    });

    it("skips a missing optional value without prompting", async () => {
      const inputs = await service.resolveGeneratorInputs({
        promptWhenMissing: false,
        rawArguments: [],
        schema: { properties: { note: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({});
    });

    it("prompts for a missing required value when interactive", async () => {
      promptRunner.mockResolvedValue({ value: "my-widget" });

      const inputs = await service.resolveGeneratorInputs({
        promptWhenMissing: true,
        rawArguments: [],
        schema: REQUIRED_NAME_SCHEMA,
      });

      expect(inputs).toStrictEqual({ name: "my-widget" });
    });

    it("drops a prompted value the caller left blank", async () => {
      promptRunner.mockResolvedValue({ value: "   " });

      const inputs = await service.resolveGeneratorInputs({
        promptWhenMissing: true,
        rawArguments: [],
        schema: { properties: { note: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({});
    });

    it("rejects a prompted value the schema refuses", async () => {
      promptRunner.mockResolvedValue({ value: "nope" });

      await expect(
        service.resolveGeneratorInputs({
          promptWhenMissing: true,
          rawArguments: [],
          schema: {
            properties: { type: { enum: ["packages", "applications"] } },
            required: ["type"],
          },
        }),
      ).rejects.toThrow("type must be one of: packages, applications");
    });

    it("rejects a value outside the schema enum", async () => {
      await expect(
        service.resolveGeneratorInputs({
          promptWhenMissing: false,
          rawArguments: ["--type", "nope"],
          schema: {
            properties: { type: { enum: ["packages", "applications"] } },
            required: ["type"],
          },
        }),
      ).rejects.toThrow("type must be one of: packages, applications");
    });
  });

  describe("resolveInputsFromValues", () => {
    it("passes through values the caller already had", async () => {
      const inputs = await service.resolveInputsFromValues({
        promptWhenMissing: false,
        providedInputs: { config: "configuration/conformetry.config.ts" },
        schema: { properties: { config: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({
        config: "configuration/conformetry.config.ts",
      });
    });

    it("omits values the caller left undefined", async () => {
      const inputs = await service.resolveInputsFromValues({
        promptWhenMissing: false,
        providedInputs: { projects: undefined },
        schema: { properties: { projects: { type: "string" } } },
      });

      expect(inputs).toStrictEqual({});
    });
  });
});
