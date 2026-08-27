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

  // 🧭 Autocomplete

  it("completes a value against the suggestions it was given", async () => {
    promptRunner.mockResolvedValue({ value: "src/a.service.ts#A.b" });

    await expect(
      service.promptForAutocomplete({
        message: "Which callable?",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).resolves.toBe("src/a.service.ts#A.b");
  });

  it("narrows the suggestions to what was typed, case-insensitively", () => {
    expect(
      service.completeSuggestions({
        input: "A.B",
        suggestions: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
      }),
    ).toStrictEqual(["src/a.service.ts#A.b"]);
  });

  // The name is far more often what someone remembers than the path.
  it("matches a suggestion on any part of it, not only its start", () => {
    expect(
      service.completeSuggestions({
        input: "Z.y",
        suggestions: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
      }),
    ).toStrictEqual(["src/z.service.ts#Z.y"]);
  });

  // `prompts` submits the selected suggestion and never the raw text, so a
  // value absent from the list could not be typed at all without this.
  it("offers what was typed as its own choice when nothing matches", () => {
    expect(
      service.completeSuggestions({
        input: "src/new.service.ts#New.made",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).toStrictEqual(["src/new.service.ts#New.made"]);
  });

  // Alongside real matches it would sit at the top of every list, ahead of
  // the completions that were the point of asking.
  it("never offers the typed text alongside real matches", () => {
    expect(
      service.completeSuggestions({
        input: "A.b",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).toStrictEqual(["src/a.service.ts#A.b"]);
  });

  it("offers every suggestion before anything has been typed", () => {
    expect(
      service.completeSuggestions({
        input: "",
        suggestions: ["src/a.service.ts#A.b"],
      }),
    ).toStrictEqual(["src/a.service.ts#A.b"]);
  });

  it("offers nothing for an empty list nobody has typed into", () => {
    expect(
      service.completeSuggestions({ input: "", suggestions: [] }),
    ).toStrictEqual([]);
  });

  // The adapter between the completion rule and what `prompts` renders: each
  // surviving suggestion has to arrive as its own titled choice, or the list
  // shows blank rows.
  it("hands the prompt each completion as a titled choice", async () => {
    promptRunner.mockResolvedValue({ value: "src/a.service.ts#A.b" });

    await service.promptForAutocomplete({
      message: "Which callable?",
      suggestions: ["src/a.service.ts#A.b", "src/z.service.ts#Z.y"],
    });

    const request = promptRunner.mock.calls[0]?.[0];

    if (
      request === undefined ||
      Array.isArray(request) ||
      !("suggest" in request) ||
      request.suggest === undefined
    ) {
      throw new Error("The prompt was asked for without a completer.");
    }

    const offered = (await request.suggest("A.b", [])) as {
      title: string;
      value: string;
    }[];

    expect(offered).toStrictEqual([
      { title: "src/a.service.ts#A.b", value: "src/a.service.ts#A.b" },
    ]);
  });

  it("refuses an autocomplete answered with nothing", async () => {
    promptRunner.mockResolvedValue({ value: "  " });

    await expect(
      service.promptForAutocomplete({
        message: "Which callable?",
        suggestions: [],
      }),
    ).rejects.toThrow("A value is required.");
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
