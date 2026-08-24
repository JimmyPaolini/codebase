import { ConfigurationService } from "@callidescope/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "@codebase/logger";

import { RunPlanService } from "./run-plan.service";

import type { RunMode } from "./run-plan.types";
import type { ResolvedCallidescopeConfiguration } from "@callidescope/configuration";

/** What `--check` says it accepts, quoted the way every message quotes it. */
const ACCEPTED =
  `It takes a comma-separated set drawn from "breadth" and "depth" and "reports", ` +
  `as in "--check breadth,depth,reports".`;

/** A resolved configuration with the defaults this suite assumes. */
function buildConfiguration(
  overrides: Partial<ResolvedCallidescopeConfiguration> = {},
): ResolvedCallidescopeConfiguration {
  return {
    allowSpreadFor: [],
    entryPoints: {
      decorators: [],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    },
    exclude: [],
    excludeFrom: [],
    ignoreCallees: [],
    limits: {
      callerMajorityRatio: 0.8,
      directSpreadThreshold: 3,
      maximumDepth: 6,
      maximumImplementationCandidates: 8,
      minimumCallers: 2,
      spreadThreshold: 4,
    },
    output: {
      format: "markdown",
      json: undefined,
      markdown: undefined,
      mermaid: undefined,
      projectReadmes: undefined,
    },
    projects: [],
    ...overrides,
  };
}

/** A run mode with every gate off. */
function buildMode(overrides: Partial<RunMode> = {}): RunMode {
  return {
    checksBreadth: false,
    checksDepth: false,
    checksReports: false,
    writes: false,
    ...overrides,
  };
}

describe(RunPlanService, () => {
  let service: RunPlanService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RunPlanService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(RunPlanService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  // 🎛️ Reading the check set

  it("gates nothing when the flag is absent", () => {
    const { errors, mode } = service.selectMode({});

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksBreadth: false,
      checksDepth: false,
      checksReports: false,
      writes: false,
    });
  });

  it("gates breadth alone when breadth alone was named", () => {
    const { errors, mode } = service.selectMode({ check: "breadth" });

    expect(errors).toStrictEqual([]);
    expect(mode.checksBreadth).toBe(true);
    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(false);
  });

  it("gates depth alone when depth alone was named", () => {
    const { errors, mode } = service.selectMode({ check: "depth" });

    expect(errors).toStrictEqual([]);
    expect(mode.checksBreadth).toBe(false);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(false);
  });

  it("gates staleness alone when reports alone was named", () => {
    const { mode } = service.selectMode({ check: "reports" });

    expect(mode.checksBreadth).toBe(false);
    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(true);
  });

  it("gates all three when all three were named", () => {
    const { errors, mode } = service.selectMode({
      check: "breadth,depth,reports",
    });

    expect(errors).toStrictEqual([]);
    expect(mode.checksBreadth).toBe(true);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(true);
  });

  it("gates depth and breadth independently of one another", () => {
    const { mode } = service.selectMode({ check: "breadth" });

    expect(mode.checksBreadth).toBe(true);
    expect(mode.checksDepth).toBe(false);
  });

  it("ignores the spaces somebody wrote around a name", () => {
    const { errors, mode } = service.selectMode({ check: " depth , reports " });

    expect(errors).toStrictEqual([]);
    expect(mode.checksDepth).toBe(true);
    expect(mode.checksReports).toBe(true);
  });

  it("refuses a flag carrying no value", () => {
    // Read as "gate everything" this used to be one flag over two findings,
    // which is the conflation the set exists to undo.
    const { errors, mode } = service.selectMode({ check: true });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
    expect(mode.checksDepth).toBe(false);
    expect(mode.checksReports).toBe(false);
  });

  it("refuses an empty value", () => {
    const { errors } = service.selectMode({ check: "" });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
  });

  it("refuses a value that is nothing but separators", () => {
    const { errors } = service.selectMode({ check: " , " });

    expect(errors).toStrictEqual([`--check needs a value. ${ACCEPTED}`]);
  });

  it("refuses a name it does not know, and names what it takes", () => {
    const { errors, mode } = service.selectMode({ check: "limits" });

    expect(errors).toStrictEqual([
      `--check does not accept "limits". ${ACCEPTED}`,
    ]);
    expect(mode.checksDepth).toBe(false);
  });

  it("reports every unknown name in one run", () => {
    const { errors } = service.selectMode({ check: "limits,stacks" });

    expect(errors).toHaveLength(2);
  });

  it("keeps the names it knows from a set that also holds one it does not", () => {
    const { errors, mode } = service.selectMode({ check: "depth,limits" });

    expect(errors).toHaveLength(1);
    expect(mode.checksDepth).toBe(true);
  });

  // ✍️ Writing

  it("writes when the write flag was given", () => {
    const { errors, mode } = service.selectMode({ write: true });

    expect(errors).toStrictEqual([]);
    expect(mode.writes).toBe(true);
  });

  it("does not write for a flag that was explicitly turned off", () => {
    const { mode } = service.selectMode({ write: false });

    expect(mode.writes).toBe(false);
  });

  it("writes and gates depth in one run", () => {
    const { errors, mode } = service.selectMode({
      check: "depth",
      write: true,
    });

    expect(errors).toStrictEqual([]);
    expect(mode).toStrictEqual({
      checksBreadth: false,
      checksDepth: true,
      checksReports: false,
      writes: true,
    });
  });

  it("refuses writing and checking reports at once", () => {
    const { errors } = service.selectMode({ check: "reports", write: true });

    expect(errors).toStrictEqual([
      `--write cannot be combined with --check reports: a report cannot be stale in the run that just wrote it. Drop one of them, or run --write and --check reports separately.`,
    ]);
  });

  // 📄 Touching files

  it("touches files when it writes", () => {
    expect(
      service.touchesFiles({
        checksBreadth: false,
        checksDepth: false,
        checksReports: false,
        writes: true,
      }),
    ).toBe(true);
  });

  it("touches files when it compares them", () => {
    expect(
      service.touchesFiles({
        checksBreadth: false,
        checksDepth: false,
        checksReports: true,
        writes: false,
      }),
    ).toBe(true);
  });

  it("leaves files alone when it only gates depth", () => {
    expect(
      service.touchesFiles({
        checksBreadth: false,
        checksDepth: true,
        checksReports: false,
        writes: false,
      }),
    ).toBe(false);
  });

  // 🌐 Validating the configuration

  it("passes a configuration that already sets the breadth limit", () => {
    expect(
      service.validateConfiguration({
        configuration: buildConfiguration({
          limits: { ...buildConfiguration().limits, maximumBreadth: 3 },
        }),
        mode: buildMode({ checksBreadth: true }),
      }),
    ).toStrictEqual([]);
  });

  it("passes an unset breadth limit when breadth is not gated", () => {
    expect(
      service.validateConfiguration({
        configuration: buildConfiguration(),
        mode: buildMode(),
      }),
    ).toStrictEqual([]);
  });

  it("refuses to gate breadth without a configured limit", () => {
    expect(
      service.validateConfiguration({
        configuration: buildConfiguration(),
        mode: buildMode({ checksBreadth: true }),
      }),
    ).toStrictEqual([
      "--check breadth requires limits.maximumBreadth to be set. Add `limits: { maximumBreadth: <number> }` to your callidescope.config.ts before running --check breadth.",
    ]);
  });
});
