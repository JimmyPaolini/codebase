import { InputService } from "@codependix/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CodependixCommand } from "./codependix.command";
import { CodependixService } from "./codependix.service";

import type { GraphRunOutcome } from "../delivery/delivery.types";
import type { CodependixCommandOptions } from "./codependix.types";

describe(CodependixCommand, () => {
  let command: CodependixCommand;
  let codependixService: CodependixService;
  let inputService: InputService;
  let loggerService: LoggerService;

  /** Builds a command whose collaborators are freshly mocked. */
  function buildCommand(): CodependixCommand {
    return new CodependixCommand(
      codependixService,
      inputService,
      loggerService,
    );
  }

  /** Runs a freshly built command with the given options. */
  async function run(options: CodependixCommandOptions = {}): Promise<void> {
    await buildCommand().run([], options);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodependixCommand,
        {
          provide: CodependixService,
          useValue: createMock<CodependixService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(CodependixCommand);
  });

  beforeEach(() => {
    process.exitCode = 0;
    codependixService = createMock<CodependixService>();
    inputService = createMock<InputService>();
    loggerService = createMock<LoggerService>();
    vi.mocked(codependixService.run).mockResolvedValue({
      failures: [],
      results: [],
    });
    // Non-interactive by default, so a test that means to exercise prompting
    // has to say so — an accidental prompt would otherwise pass silently.
    vi.mocked(inputService.canPrompt).mockReturnValue(false);
    vi.mocked(inputService.parseFlagOption).mockImplementation(
      (value) => value ?? true,
    );
    vi.mocked(inputService.parseOptionalOption).mockImplementation(
      (value) => value,
    );
    vi.mocked(inputService.parsePathOption).mockImplementation(
      (value) => value ?? process.cwd(),
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodependixCommand,
        {
          provide: CodependixService,
          useValue: createMock<CodependixService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CodependixCommand");
  });

  it("rejects a command line naming neither --check nor --write", async () => {
    await run({});

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
  });

  it("prompts for the mode when neither flag was given and the session can be asked", async () => {
    vi.mocked(inputService.canPrompt).mockReturnValue(true);
    vi.mocked(inputService.promptForSelect).mockResolvedValue("check");

    await run({});

    expect(process.exitCode).toBe(0);
    expect(codependixService.run).toHaveBeenCalledWith(
      { check: true },
      process.cwd(),
    );
  });

  it("runs the write mode a prompt resolved to", async () => {
    vi.mocked(inputService.canPrompt).mockReturnValue(true);
    vi.mocked(inputService.promptForSelect).mockResolvedValue("write");

    await run({});

    expect(codependixService.run).toHaveBeenCalledWith(
      { write: true },
      process.cwd(),
    );
  });

  it("fails and logs when the mode prompt was cancelled", async () => {
    vi.mocked(inputService.canPrompt).mockReturnValue(true);
    vi.mocked(inputService.promptForSelect).mockRejectedValue(
      new Error("Prompt did not resolve to one of: check, write."),
    );

    await run({});

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "Prompt did not resolve to one of: check, write." },
    );
  });

  it("never prompts when --no-interactive was given", async () => {
    await run({ interactive: false });

    expect(process.exitCode).toBe(1);
    expect(inputService.canPrompt).toHaveBeenCalledWith(false);
    expect(inputService.promptForSelect).not.toHaveBeenCalled();
  });

  it("rejects a command line naming both --check and --write", async () => {
    await run({ check: true, write: true });

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
  });

  it("succeeds when every result is current and nothing failed", async () => {
    await run({ write: true });

    expect(process.exitCode).toBe(0);
  });

  it("fails in check mode when a result is stale", async () => {
    const outcome: GraphRunOutcome = {
      failures: [],
      results: [
        {
          isCurrent: false,
          projectName: "codependix-nx",
          stalePaths: ["codependix-nx.json"],
        },
      ],
    };
    vi.mocked(codependixService.run).mockResolvedValue(outcome);

    await run({ check: true });

    expect(process.exitCode).toBe(1);
  });

  it("fails and logs when a project fails, without a thrown error", async () => {
    const outcome: GraphRunOutcome = {
      failures: [{ error: "boom", projectName: "codependix-nestjs" }],
      results: [
        { isCurrent: true, projectName: "codependix-nx", stalePaths: [] },
      ],
    };
    vi.mocked(codependixService.run).mockResolvedValue(outcome);

    await run({ write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { failures: outcome.failures },
    );
  });

  it("reports both a failed project and a stale export together", async () => {
    const outcome: GraphRunOutcome = {
      failures: [{ error: "boom", projectName: "codependix-nestjs" }],
      results: [
        {
          isCurrent: false,
          projectName: "codependix-nx",
          stalePaths: ["codependix-nx.json"],
        },
      ],
    };
    vi.mocked(codependixService.run).mockResolvedValue(outcome);

    await run({ check: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { failures: outcome.failures },
    );
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found stale codependix exports",
      undefined,
      { projects: ["codependix-nx"] },
    );
  });

  it("runs codependix with the resolved options and working directory", async () => {
    await run({ write: true });

    expect(codependixService.run).toHaveBeenCalledWith(
      { write: true },
      process.cwd(),
    );
  });

  it("fails and logs when the run throws", async () => {
    vi.mocked(codependixService.run).mockRejectedValue(new Error("boom"));

    await run({ write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "boom" },
    );
  });

  it("fails and logs a non-Error rejection as its string form", async () => {
    vi.mocked(codependixService.run).mockRejectedValue("boom");

    await run({ write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "boom" },
    );
  });

  // Each of these asserts the hand-off, not the parsed value: the rules
  // themselves are the input service's, and are covered by its own tests.
  // Sentinels rather than realistic answers, so a parser reintroduced inline
  // here fails rather than coincidentally agreeing with the stub.

  it("delegates --check to the shared input service", () => {
    vi.mocked(inputService.parseFlagOption).mockReturnValue(false);

    expect(buildCommand().parseCheck(undefined)).toBe(false);
    expect(inputService.parseFlagOption).toHaveBeenCalledWith(undefined);
  });

  it("delegates --write to the shared input service", () => {
    vi.mocked(inputService.parseFlagOption).mockReturnValue(false);

    expect(buildCommand().parseWrite(undefined)).toBe(false);
    expect(inputService.parseFlagOption).toHaveBeenCalledWith(undefined);
  });

  it("delegates --config to the shared input service", () => {
    vi.mocked(inputService.parseOptionalOption).mockReturnValue("parsed");

    expect(buildCommand().parseConfig("  codependix.config.ts  ")).toBe(
      "parsed",
    );
    expect(inputService.parseOptionalOption).toHaveBeenCalledWith(
      "  codependix.config.ts  ",
    );
  });

  it("delegates --directory to the shared input service", () => {
    vi.mocked(inputService.parsePathOption).mockReturnValue("parsed");

    expect(buildCommand().parseDirectory(undefined)).toBe("parsed");
    expect(inputService.parsePathOption).toHaveBeenCalledWith(undefined);
  });

  it("reads --no-interactive as the opt-out it is", () => {
    expect(buildCommand().parseInteractive()).toBe(false);
  });
});
