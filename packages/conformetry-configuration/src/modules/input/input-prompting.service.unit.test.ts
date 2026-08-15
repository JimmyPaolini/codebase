import { Test } from "@nestjs/testing";
import prompts from "prompts";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { InputPromptingService } from "./input-prompting.service";
import { InputSchemaService } from "./input-schema.service";

// Mocked at the module boundary so the service's own wiring is exercised and
// no test ever reaches for a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

describe(InputPromptingService, () => {
  let service: InputPromptingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputPromptingService, InputSchemaService],
    }).compile();

    service = await module.resolve(InputPromptingService);
  });

  beforeEach(() => {
    promptRunner.mockReset();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("promptForInput", () => {
    it("returns the answer the caller typed", async () => {
      promptRunner.mockResolvedValue({ value: "my-widget" });

      await expect(
        service.promptForInput({
          inputName: "name",
          isRequired: true,
          propertySchema: { type: "string" },
        }),
      ).resolves.toBe("my-widget");
    });

    it("returns nothing when the prompt is cancelled", async () => {
      promptRunner.mockResolvedValue({});

      await expect(
        service.promptForInput({
          inputName: "name",
          isRequired: true,
          propertySchema: { type: "string" },
        }),
      ).resolves.toBeUndefined();
    });

    it("hands prompts a validator backed by the schema", async () => {
      promptRunner.mockResolvedValue({ value: "my-widget" });

      await service.promptForInput({
        inputName: "name",
        isRequired: true,
        propertySchema: { type: "string" },
      });

      const options = promptRunner.mock.calls[0]?.[0];

      if (options === undefined || Array.isArray(options)) {
        throw new Error("prompts was not called with a single prompt");
      }

      // The extra arguments are prompts' own signature: previous answers and
      // the prompt itself, neither of which this validator reads.
      expect(options.validate?.("my-widget", {}, options)).toBe(true);
      expect(options.validate?.("", {}, options)).toBe("name is required");
    });

    it("offers a choice list when the schema declares an enum", async () => {
      promptRunner.mockResolvedValue({ value: "packages" });

      await service.promptForInput({
        inputName: "type",
        isRequired: true,
        propertySchema: { enum: ["applications", "packages"] },
      });

      expect(promptRunner).toHaveBeenCalledWith(
        expect.objectContaining({ type: "select" }),
      );
    });

    it("asks for free text when the schema declares no enum", async () => {
      promptRunner.mockResolvedValue({ value: "my-widget" });

      await service.promptForInput({
        inputName: "name",
        isRequired: true,
        propertySchema: { type: "string" },
      });

      expect(promptRunner).toHaveBeenCalledWith(
        expect.objectContaining({ type: "text" }),
      );
    });

    it("returns nothing when the caller cancels", async () => {
      promptRunner.mockResolvedValue({});

      await expect(
        service.promptForInput({
          inputName: "name",
          isRequired: true,
          propertySchema: { type: "string" },
        }),
      ).resolves.toBeUndefined();
    });
  });
});
