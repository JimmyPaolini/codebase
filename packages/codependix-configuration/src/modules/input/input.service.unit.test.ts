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

  it("refuses to prompt when stdin is not a terminal", () => {
    process.stdin.isTTY = false;

    expect(service.canPrompt(undefined)).toBe(false);
  });

  it("refuses to prompt in CI even on a terminal", () => {
    process.stdin.isTTY = true;
    process.env["CI"] = "true";

    expect(service.canPrompt(undefined)).toBe(false);
  });

  // 🚩 Flag option

  it("reads a valueless boolean flag as present", () => {
    expect(service.parseFlagOption(undefined)).toBe(true);
  });

  it("passes an explicit boolean flag value through", () => {
    expect(service.parseFlagOption(false)).toBe(false);
  });

  // 🔡 Optional option

  it("passes a non-blank optional option through trimmed", () => {
    expect(service.parseOptionalOption("  codependix.config.ts  ")).toBe(
      "codependix.config.ts",
    );
  });

  it("reads a blank optional option as absent", () => {
    expect(service.parseOptionalOption("   ")).toBeUndefined();
  });

  it("reads an absent optional option as absent", () => {
    expect(service.parseOptionalOption(undefined)).toBeUndefined();
  });

  // 📂 Path option

  it("passes a given path option through trimmed", () => {
    expect(service.parsePathOption("  packages/logger  ")).toBe(
      "packages/logger",
    );
  });

  it("falls back to the working directory for an absent path option", () => {
    expect(service.parsePathOption(undefined)).toBe(process.cwd());
  });

  it("falls back to the working directory for a blank path option", () => {
    expect(service.parsePathOption("   ")).toBe(process.cwd());
  });

  // 🗣️ Prompting

  it("resolves a select prompt to the choice the user picked", async () => {
    promptRunner.mockResolvedValue({ value: "write" });

    await expect(
      service.promptForSelect({
        choices: ["check", "write"],
        message: "Which mode?",
      }),
    ).resolves.toBe("write");
  });

  it("rejects a select prompt that resolved outside its choices", async () => {
    promptRunner.mockResolvedValue({ value: "nonsense" });

    await expect(
      service.promptForSelect({
        choices: ["check", "write"],
        message: "Which mode?",
      }),
    ).rejects.toThrow("Prompt did not resolve to one of");
  });

  it("rejects a select prompt that was cancelled", async () => {
    promptRunner.mockResolvedValue({});

    await expect(
      service.promptForSelect({
        choices: ["check", "write"],
        message: "Which mode?",
      }),
    ).rejects.toThrow("Prompt did not resolve to one of");
  });
});
