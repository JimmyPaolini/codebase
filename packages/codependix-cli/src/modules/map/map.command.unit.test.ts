import { BoundaryReportService } from "@codependix/boundaries";
import { InputService, missingInputError } from "@codependix/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { BoundaryCheckService } from "../boundary-check/boundary-check.service";
import { RUN_MODE_SUBJECT } from "../run-plan/run-plan.constants";
import { RunPlanService } from "../run-plan/run-plan.service";

import { MapCommand } from "./map.command";
import { MapService } from "./map.service";

import type { BoundaryCheckOutcome } from "../boundary-check/boundary-check.types";
import type { GraphRunOutcome } from "../delivery/delivery.types";
import type { RunMode } from "../run-plan/run-plan.types";
import type { MapCommandOptions } from "./map.types";
import type { BoundaryViolation } from "@codependix/boundaries";

/** Builds a run mode, defaulting every flag a test does not name. */
function buildMode(overrides: Partial<RunMode> = {}): RunMode {
  return {
    checksBoundaries: false,
    checksReports: false,
    writes: true,
    ...overrides,
  };
}

const VIOLATION: BoundaryViolation = {
  cycle: undefined,
  level: "nx",
  message: "layers: a must not depend on b.",
  rule: "layers",
  scope: "workspace",
  source: "a",
  target: "b",
};

describe(MapCommand, () => {
  let command: MapCommand;
  let boundaryCheckService: BoundaryCheckService;
  let boundaryReportService: BoundaryReportService;
  let codependixService: MapService;
  let inputService: InputService;
  let loggerService: LoggerService;
  let runPlanService: RunPlanService;

  /** Builds a command whose collaborators are freshly mocked. */
  function buildCommand(): MapCommand {
    return new MapCommand(
      codependixService,
      boundaryCheckService,
      boundaryReportService,
      inputService,
      loggerService,
      runPlanService,
    );
  }

  /** Runs a freshly built command with the given options. */
  async function run(options: MapCommandOptions = {}): Promise<void> {
    await buildCommand().run([], options);
  }

  /** Hands the command a mode, as the run plan would have resolved one. */
  function selectMode(overrides: Partial<RunMode> = {}): RunMode {
    const mode = buildMode(overrides);

    vi.mocked(runPlanService.selectMode).mockResolvedValue({
      errors: [],
      mode,
    });
    vi.mocked(runPlanService.touchesFiles).mockReturnValue(
      mode.checksReports || mode.writes,
    );

    return mode;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MapCommand,
        {
          provide: BoundaryCheckService,
          useValue: createMock<BoundaryCheckService>(),
        },
        {
          provide: BoundaryReportService,
          useValue: new BoundaryReportService(),
        },
        { provide: MapService, useValue: createMock<MapService>() },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: RunPlanService, useValue: createMock<RunPlanService>() },
      ],
    }).compile();

    command = await module.resolve(MapCommand);
  });

  beforeEach(() => {
    process.exitCode = 0;
    boundaryCheckService = createMock<BoundaryCheckService>();
    boundaryReportService = new BoundaryReportService();
    codependixService = createMock<MapService>();
    inputService = createMock<InputService>();
    loggerService = createMock<LoggerService>();
    runPlanService = createMock<RunPlanService>();
    vi.mocked(codependixService.run).mockResolvedValue({
      failures: [],
      results: [],
    });
    vi.mocked(boundaryCheckService.run).mockResolvedValue({
      failures: [],
      violations: [],
    });
    vi.mocked(inputService.parseOptionalOption).mockImplementation(
      (value) => value,
    );
    vi.mocked(inputService.parsePathOption).mockImplementation(
      (value) => value ?? process.cwd(),
    );
    vi.mocked(inputService.parseFlagOption).mockImplementation(
      (value) => value ?? true,
    );
    selectMode();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        MapCommand,
        {
          provide: BoundaryCheckService,
          useValue: createMock<BoundaryCheckService>(),
        },
        {
          provide: BoundaryReportService,
          useValue: new BoundaryReportService(),
        },
        { provide: MapService, useValue: createMock<MapService>() },
        { provide: InputService, useValue: createMock<InputService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: RunPlanService, useValue: createMock<RunPlanService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("MapCommand");
  });

  it("reports a rejected command line without attempting anything", async () => {
    vi.mocked(runPlanService.selectMode).mockResolvedValue({
      errors: ["--check needs a value."],
      mode: buildMode({ writes: false }),
    });

    await run({ check: true });

    expect(process.exitCode).toBe(1);
    expect(codependixService.run).not.toHaveBeenCalled();
    expect(boundaryCheckService.run).not.toHaveBeenCalled();
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Rejected the command line",
      undefined,
      { reasons: ["--check needs a value."] },
    );
  });

  it("reports an unanswerable prompt as a rejected command line", async () => {
    vi.mocked(runPlanService.selectMode).mockRejectedValue(
      missingInputError(RUN_MODE_SUBJECT),
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

  it("reports anything else the resolution threw as a failed run", async () => {
    vi.mocked(runPlanService.selectMode).mockRejectedValue(new Error("boom"));

    await run({});

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { reason: "boom" },
    );
  });

  it("builds the context once and hands it to both passes", async () => {
    selectMode({ checksBoundaries: true, writes: true });

    await run({ directory: "/workspace" });

    expect(codependixService.buildContext).toHaveBeenCalledWith({
      mode: "write",
      options: { directory: "/workspace" },
      workingDirectory: "/workspace",
    });
    expect(codependixService.run).toHaveBeenCalledTimes(1);
    expect(boundaryCheckService.run).toHaveBeenCalledTimes(1);
  });

  it("builds a check-mode context when the run writes nothing", async () => {
    selectMode({ checksReports: true, writes: false });

    await run({});

    expect(codependixService.buildContext).toHaveBeenCalledWith({
      mode: "check",
      options: {},
      workingDirectory: process.cwd(),
    });
  });

  it("delivers no export when only boundaries are checked", async () => {
    selectMode({ checksBoundaries: true, writes: false });

    await run({ check: "boundaries" });

    expect(codependixService.run).not.toHaveBeenCalled();
    expect(boundaryCheckService.run).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(0);
    expect(loggerService.info).toHaveBeenCalledWith(
      "🕸️ Verified every declared codependix boundary holds",
    );
  });

  it("judges no boundary when only exports are checked", async () => {
    selectMode({ checksReports: true, writes: false });

    await run({ check: "reports" });

    expect(boundaryCheckService.run).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
    expect(loggerService.info).toHaveBeenCalledWith(
      "🕸️ Verified every configured codependix export is current",
      undefined,
      { projects: 0 },
    );
  });

  it("succeeds when every result is current and nothing failed", async () => {
    await run({ write: true });

    expect(process.exitCode).toBe(0);
  });

  it("fails in check mode when a result is stale", async () => {
    selectMode({ checksReports: true, writes: false });
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

    await run({ check: "reports" });

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
    selectMode({ checksReports: true, writes: false });
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

    await run({ check: "reports" });

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

  it("fails and names every boundary violation it found", async () => {
    selectMode({ checksBoundaries: true, writes: false });
    const outcome: BoundaryCheckOutcome = {
      failures: [],
      violations: [VIOLATION],
    };
    vi.mocked(boundaryCheckService.run).mockResolvedValue(outcome);

    await run({ check: "boundaries" });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found codependix boundary violations",
      undefined,
      {
        summary: "1 boundary violation across 1 rule.",
        violations: ["nx workspace: layers: a must not depend on b."],
      },
    );
  });

  it("fails and logs a project whose graph could not be judged", async () => {
    selectMode({ checksBoundaries: true, writes: false });
    vi.mocked(boundaryCheckService.run).mockResolvedValue({
      failures: [{ error: "boom", projectName: "lexico" }],
      violations: [],
    });

    await run({ check: "boundaries" });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "💥 Failed running codependix",
      undefined,
      { failures: [{ error: "boom", projectName: "lexico" }] },
    );
  });

  it("reports a stale export and a broken boundary in the same run", async () => {
    selectMode({ checksBoundaries: true, writes: true });
    vi.mocked(codependixService.run).mockResolvedValue({
      failures: [],
      results: [
        { isCurrent: false, projectName: "codependix-nx", stalePaths: ["a"] },
      ],
    });
    vi.mocked(boundaryCheckService.run).mockResolvedValue({
      failures: [],
      violations: [VIOLATION],
    });

    await run({ check: "boundaries", write: true });

    expect(process.exitCode).toBe(1);
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found stale codependix exports",
      undefined,
      { projects: ["codependix-nx"] },
    );
    expect(loggerService.error).toHaveBeenCalledWith(
      "🕸️ Found codependix boundary violations",
      undefined,
      expect.anything(),
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

  it("hands --check through unparsed, for the run plan to read", () => {
    expect(buildCommand().parseCheck("boundaries,reports")).toBe(
      "boundaries,reports",
    );
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

  it("delegates mode resolution to the run plan", async () => {
    await run({ directory: "packages/logger" });

    expect(runPlanService.selectMode).toHaveBeenCalledWith({
      directory: "packages/logger",
    });
  });
});
