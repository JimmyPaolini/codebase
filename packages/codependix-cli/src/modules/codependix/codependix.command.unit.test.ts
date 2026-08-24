import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { CodependixCommand } from "./codependix.command";
import { CodependixService } from "./codependix.service";

import type { ProjectRunResult } from "../delivery/delivery.types";
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
    vi.mocked(codependixService.runNxGraphs).mockResolvedValue([]);
    vi.mocked(codependixService.runNestjsGraphs).mockResolvedValue([]);
    vi.mocked(codependixService.runImportGraphs).mockResolvedValue([]);
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
    expect(codependixService.runNxGraphs).not.toHaveBeenCalled();
  });

  it("rejects a command line naming both --check and --write", async () => {
    await run({ check: true, write: true });

    expect(process.exitCode).toBe(1);
    expect(codependixService.runNxGraphs).not.toHaveBeenCalled();
  });

  it("succeeds when every result is current", async () => {
    await run({ write: true });

    expect(process.exitCode).toBe(0);
  });

  it("fails in check mode when an nx result is stale", async () => {
    const staleResult: ProjectRunResult = {
      isCurrent: false,
      projectName: "codependix-nx",
      stalePaths: ["codependix-nx.json"],
    };
    vi.mocked(codependixService.runNxGraphs).mockResolvedValue([staleResult]);

    await run({ check: true });

    expect(process.exitCode).toBe(1);
  });

  it("fails in check mode when a nestjs result is stale", async () => {
    const staleResult: ProjectRunResult = {
      isCurrent: false,
      projectName: "codependix-cli",
      stalePaths: ["codependix-cli.json"],
    };
    vi.mocked(codependixService.runNestjsGraphs).mockResolvedValue([
      staleResult,
    ]);

    await run({ check: true });

    expect(process.exitCode).toBe(1);
  });

  it("fails in check mode when an imports result is stale", async () => {
    const staleResult: ProjectRunResult = {
      isCurrent: false,
      projectName: "codependix-imports",
      stalePaths: ["codependix-imports.json"],
    };
    vi.mocked(codependixService.runImportGraphs).mockResolvedValue([
      staleResult,
    ]);

    await run({ check: true });

    expect(process.exitCode).toBe(1);
  });

  it("runs the nx, nestjs, and imports graphs", async () => {
    await run({ write: true });

    expect(codependixService.runNxGraphs).toHaveBeenCalledWith(
      { write: true },
      process.cwd(),
    );
    expect(codependixService.runNestjsGraphs).toHaveBeenCalledWith(
      { write: true },
      process.cwd(),
    );
    expect(codependixService.runImportGraphs).toHaveBeenCalledWith(
      { write: true },
      process.cwd(),
    );
  });

  it("fails and logs when the run throws", async () => {
    vi.mocked(codependixService.runNxGraphs).mockRejectedValue(
      new Error("boom"),
    );

    await run({ write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "boom" },
    );
  });

  it("fails and logs a non-Error rejection as its string form", async () => {
    vi.mocked(codependixService.runNxGraphs).mockRejectedValue("boom");

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
