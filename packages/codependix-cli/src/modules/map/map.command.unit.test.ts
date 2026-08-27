import {
  conflictingRunModeError,
  InputService,
  missingInputError,
  promptCancelledError,
} from "@codependix/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MapCommand } from "./map.command";
import { MapService } from "./map.service";

import type { GraphRunOutcome } from "../delivery/delivery.types";
import type { MapCommandOptions } from "./map.types";

describe(MapCommand, () => {
  let command: MapCommand;
  let codependixService: MapService;
  let inputService: InputService;
  let loggerService: LoggerService;

  /** Builds a command whose collaborators are freshly mocked. */
  function buildCommand(): MapCommand {
    return new MapCommand(codependixService, inputService, loggerService);
  }

  /** Runs a freshly built command with the given options. */
  async function run(options: MapCommandOptions = {}): Promise<void> {
    await buildCommand().run([], options);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MapCommand,
        {
          provide: MapService,
          useValue: createMock<MapService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(MapCommand);
  });

  beforeEach(() => {
    process.exitCode = 0;
    codependixService = createMock<MapService>();
    inputService = createMock<InputService>();
    loggerService = createMock<LoggerService>();
    vi.mocked(codependixService.run).mockResolvedValue({
      failures: [],
      results: [],
    });
    // The command no longer picks the mode — it forwards whatever came back —
    // so a fixed hand-back stands in for the resolution, and the tests that
    // care what was forwarded set their own.
    vi.mocked(inputService.resolveOptions).mockResolvedValue({ write: true });
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
        MapCommand,
        {
          provide: MapService,
          useValue: createMock<MapService>(),
        },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("MapCommand");
  });

  it("runs whatever options the shared input service resolved", async () => {
    vi.mocked(inputService.resolveOptions).mockResolvedValue({ check: true });

    await run({});

    expect(inputService.resolveOptions).toHaveBeenCalledWith({});
    expect(process.exitCode).toBe(0);
    expect(codependixService.run).toHaveBeenCalledWith(
      { check: true },
      process.cwd(),
    );
  });

  it("reports two modes named at once as a rejected command line", async () => {
    vi.mocked(inputService.resolveOptions).mockRejectedValue(
      conflictingRunModeError(),
    );

    await run({ check: true, write: true });

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      { reason: "Only one of --check or --write may be given." },
    );
  });

  it("reports an unanswerable prompt as a rejected command line", async () => {
    vi.mocked(inputService.resolveOptions).mockRejectedValue(
      missingInputError("A run mode (--check or --write)"),
    );

    await run({});

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      {
        reason:
          "A run mode (--check or --write) is required, and stdin is not a terminal so it cannot be asked for.",
      },
    );
  });

  it("reports a dismissed prompt as a rejected command line", async () => {
    vi.mocked(inputService.resolveOptions).mockRejectedValue(
      promptCancelledError("A run mode (--check or --write)"),
    );

    await run({});

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      { reason: "A run mode (--check or --write) was not chosen." },
    );
  });

  it("reports anything else the resolution threw as a failed run", async () => {
    vi.mocked(inputService.resolveOptions).mockRejectedValue(
      new Error("Prompt did not resolve to one of: check, write."),
    );

    await run({});

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "Prompt did not resolve to one of: check, write." },
    );
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

  it("delegates run-mode resolution to the shared input service", async () => {
    vi.mocked(inputService.resolveOptions).mockResolvedValue({ write: true });

    await run({ directory: "packages/logger" });

    expect(inputService.resolveOptions).toHaveBeenCalledWith({
      directory: "packages/logger",
    });
  });
});
