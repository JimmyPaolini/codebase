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
  let loggerService: LoggerService;

  /** Builds a command whose collaborators are freshly mocked. */
  function buildCommand(): CodependixCommand {
    return new CodependixCommand(codependixService, loggerService);
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
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(CodependixCommand);
  });

  beforeEach(() => {
    process.exitCode = 0;
    codependixService = createMock<CodependixService>();
    loggerService = createMock<LoggerService>();
    vi.mocked(codependixService.run).mockResolvedValue({
      failures: [],
      results: [],
    });
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

  it("parses options from the command line", () => {
    expect(command.parseCheck(undefined)).toBe(true);
    expect(command.parseConfig("codependix.config.ts")).toBe(
      "codependix.config.ts",
    );
    expect(command.parseDirectory(undefined)).toBe(process.cwd());
    expect(command.parseWrite(undefined)).toBe(true);
  });
});
