import { Test } from "@nestjs/testing";
import prompts from "prompts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { InputService } from "./input.service";

// Mocked at the module boundary so the service's own wiring is exercised and
// no test ever reaches for a terminal.
vi.mock("prompts", () => ({ default: vi.fn() }));

const promptRunner = vi.mocked(prompts);

describe(InputService, () => {
  let service: InputService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [InputService],
    }).compile();

    service = await module.resolve(InputService);
  });

  const originalIsTty = process.stdin.isTTY;

  afterEach(() => {
    promptRunner.mockReset();
    delete process.env["CI"];
    process.stdin.isTTY = originalIsTty;
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🎛️ Prompt gating

  it("allows prompting when the session is an interactive terminal", () => {
    process.stdin.isTTY = true;

    expect(service.canPrompt(undefined)).toBe(true);
  });

  it("refuses to prompt when the interactive flag was explicitly turned off", () => {
    process.stdin.isTTY = true;

    expect(service.canPrompt(false)).toBe(false);
  });

  it("refuses to prompt in CI even on a terminal", () => {
    process.stdin.isTTY = true;
    process.env["CI"] = "true";

    expect(service.canPrompt(undefined)).toBe(false);
  });

  // 🔤 Comma-delimited option

  it("splits a comma-delimited option into its values", () => {
    expect(
      service.parseCommaDelimitedOption("packages/a, packages/b"),
    ).toStrictEqual(["packages/a", "packages/b"]);
  });

  it("reads an absent comma-delimited option as an empty list", () => {
    expect(service.parseCommaDelimitedOption(undefined)).toStrictEqual([]);
  });

  it("drops empty entries from a comma-delimited option", () => {
    expect(
      service.parseCommaDelimitedOption("packages/a,,packages/b,"),
    ).toStrictEqual(["packages/a", "packages/b"]);
  });

  // 🖨️ Format

  it.each([
    ["json", "json"],
    ["markdown", "markdown"],
    ["mermaid", "mermaid"],
    [undefined, "markdown"],
    ["nonsense", "markdown"],
  ] as const)("parses the format option %s as %s", (value, expected) => {
    expect(service.parseFormat(value)).toBe(expected);
  });

  // 🔡 Optional option

  it("passes a non-blank optional option through trimmed", () => {
    expect(service.parseOptionalOption("  callidescope.config.ts  ")).toBe(
      "callidescope.config.ts",
    );
  });

  it("reads a blank optional option as absent", () => {
    expect(service.parseOptionalOption("   ")).toBeUndefined();
  });

  it("reads an absent optional option as absent", () => {
    expect(service.parseOptionalOption(undefined)).toBeUndefined();
  });

  // 🗣️ Prompting

  it("resolves a select prompt to the choice the user picked", async () => {
    promptRunner.mockResolvedValue({ value: "json" });

    await expect(
      service.promptForSelect({
        choices: ["json", "markdown", "mermaid"],
        message: "Which format?",
      }),
    ).resolves.toBe("json");
  });

  it("rejects a select prompt that resolved outside its choices", async () => {
    promptRunner.mockResolvedValue({ value: "nonsense" });

    await expect(
      service.promptForSelect({
        choices: ["json", "markdown", "mermaid"],
        message: "Which format?",
      }),
    ).rejects.toThrow("Prompt did not resolve to one of");
  });

  it("resolves a text prompt to the trimmed answer", async () => {
    promptRunner.mockResolvedValue({ value: "  src/foo.ts#Foo.bar  " });

    await expect(
      service.promptForText({ message: "Which callable?" }),
    ).resolves.toBe("src/foo.ts#Foo.bar");
  });

  it("rejects a text prompt left blank", async () => {
    promptRunner.mockResolvedValue({ value: "   " });

    await expect(
      service.promptForText({ message: "Which callable?" }),
    ).rejects.toThrow("A value is required.");
  });

  it("rejects a text prompt that was cancelled", async () => {
    promptRunner.mockResolvedValue({});

    await expect(
      service.promptForText({ message: "Which callable?" }),
    ).rejects.toThrow("A value is required.");
  });
});
