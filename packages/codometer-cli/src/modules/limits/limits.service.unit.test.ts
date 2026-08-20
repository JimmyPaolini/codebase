import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildCodeStatistics } from "../../../testing/mocks";

import { DuplicateTargetError } from "./duplicate-target.errors";
import { EmptyTargetError } from "./empty-target.errors";
import { UnboundMetricError } from "./limits.errors";
import { LimitsService } from "./limits.service";

import type { EvaluateLimitsArguments, MeasuredTarget } from "./limits.types";
import type {
  CodometerSeverity,
  ResolvedCodometerConfiguration,
  ResolvedCodometerLimit,
} from "@codometer/configuration";

const zeroes = buildCodeStatistics();

/** The repository's own metrics, with a counter in every shape a limit reads. */
const codebaseTarget: MeasuredTarget = {
  files: 12,
  language: buildCodeStatistics({
    custom: [
      {
        color: "7c3aed",
        count: 3,
        group: "conventions",
        label: "Service Files",
      },
    ],
    linesOfCode: 700,
    markdown: { ...zeroes.markdown, files: 9 },
    typescript: { ...zeroes.typescript, interfaces: 42 },
  }),
  name: "codebase",
  size: undefined,
};

/** A declared target measuring compiled output and nothing else. */
const compiledTarget: MeasuredTarget = {
  files: 2,
  language: undefined,
  name: "Compiled JavaScript",
  size: { bytes: 4529, compression: "gzip", files: 2 },
};

/** Builds a resolved configuration carrying nothing but its limits. */
function buildConfiguration(
  limits: ResolvedCodometerLimit[],
  defaultTarget?: string,
): ResolvedCodometerConfiguration {
  return {
    defaultTarget,
    exclude: [],
    excludeFrom: [],
    limits,
    output: { json: undefined, markdown: undefined },
    python: { command: "python3" },
    statistics: [],
    targets: [],
  };
}

/** Builds a resolved limit, since only its metric and value ever vary. */
function buildLimit(
  metric: string,
  value: number,
  severity: CodometerSeverity = "fail",
): ResolvedCodometerLimit {
  return { label: undefined, metric, severity, value };
}

describe(LimitsService, () => {
  let service: LimitsService;

  /** Holds one limit against the codebase and the compiled target. */
  function evaluate(
    limit: ResolvedCodometerLimit,
    overrides: Partial<EvaluateLimitsArguments> = {},
  ): ReturnType<LimitsService["evaluate"]> {
    return service.evaluate({
      configuration: buildConfiguration([limit]),
      targets: [codebaseTarget, compiledTarget],
      ...overrides,
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [LimitsService],
    }).compile();

    service = await module.resolve(LimitsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it.each([
    ["codebase.typescript.interfaces", 42],
    ["codebase.markdown.files", 9],
    ["codebase.linesOfCode", 700],
    ["codebase.custom.Service Files", 3],
    ["codebase.files", 12],
    ["Compiled JavaScript.size", 4529],
    ["Compiled JavaScript.files", 2],
  ])("reads %s as the metric measuring %i", (metric, measured) => {
    expect(evaluate(buildLimit(metric, 1_000_000))[0]?.measured).toBe(measured);
  });

  it("reports a fail breach with the metric, its limit, and its value", () => {
    expect(
      service.evaluate({
        configuration: buildConfiguration([
          {
            label: "Compiled bundle",
            metric: "Compiled JavaScript.size",
            severity: "fail",
            value: 4000,
          },
        ]),
        targets: [codebaseTarget, compiledTarget],
      }),
    ).toStrictEqual([
      {
        breached: true,
        label: "Compiled bundle",
        limit: 4000,
        measured: 4529,
        metric: "size",
        severity: "fail",
        target: "Compiled JavaScript",
      },
    ]);
  });

  it("reports a warn breach the same way, carrying its severity", () => {
    expect(
      service.evaluate({
        configuration: buildConfiguration([
          buildLimit("codebase.typescript.interfaces", 40, "warn"),
        ]),
        targets: [codebaseTarget, compiledTarget],
      }),
    ).toStrictEqual([
      {
        breached: true,
        label: undefined,
        limit: 40,
        measured: 42,
        metric: "typescript.interfaces",
        severity: "warn",
        target: "codebase",
      },
    ]);
  });

  // A limit is the highest the metric may be, so sitting exactly on it is
  // not going over it.
  it.each([
    [42, false],
    [41, true],
    [43, false],
  ])(
    "holds 42 interfaces to a limit of %i as breached=%s",
    (value, breached) => {
      expect(
        evaluate(buildLimit("codebase.typescript.interfaces", value))[0]
          ?.breached,
      ).toBe(breached);
    },
  );

  it("gates nothing when no limit was declared", () => {
    expect(
      service.evaluate({
        configuration: buildConfiguration([]),
        targets: [codebaseTarget, compiledTarget],
      }),
    ).toStrictEqual([]);
  });

  it("reads an unqualified path as the default target's metric", () => {
    const [evaluated] = service.evaluate({
      configuration: buildConfiguration(
        [buildLimit("typescript.interfaces", 100)],
        "codebase",
      ),
      targets: [codebaseTarget, compiledTarget],
    });

    expect(evaluated?.target).toBe("codebase");
    expect(evaluated?.measured).toBe(42);
  });

  it("resolves a target whose own name holds a dot", () => {
    const legacyTarget: MeasuredTarget = {
      ...compiledTarget,
      name: "dist.old",
    };

    const [evaluated] = service.evaluate({
      configuration: buildConfiguration([buildLimit("dist.old.size", 5000)]),
      targets: [codebaseTarget, legacyTarget],
    });

    expect(evaluated?.target).toBe("dist.old");
    expect(evaluated?.metric).toBe("size");
  });

  it("refuses a path that could be read two ways", () => {
    const markdownTarget: MeasuredTarget = {
      ...compiledTarget,
      name: "markdown",
    };

    expect(() =>
      service.evaluate({
        configuration: buildConfiguration(
          [buildLimit("markdown.files", 20)],
          "codebase",
        ),
        targets: [codebaseTarget, markdownTarget],
      }),
    ).toThrow(
      /could be the "markdown" target's "files" metric, or the "codebase" target's "markdown.files" metric/,
    );
  });

  it("refuses a path two counters in one target answer to", () => {
    const doubledTarget: MeasuredTarget = {
      ...codebaseTarget,
      language: buildCodeStatistics({
        custom: [
          { color: "7c3aed", count: 3, group: "conventions", label: "Tests" },
          { color: "0284c7", count: 5, group: "conventions", label: "Tests" },
        ],
      }),
    };

    expect(() =>
      service.evaluate({
        configuration: buildConfiguration([
          buildLimit("codebase.custom.Tests", 10),
        ]),
        targets: [doubledTarget],
      }),
    ).toThrow(/more than one metric called "custom.Tests"/);
  });

  it("indexes nothing from a statistic that holds no number", () => {
    const language = buildCodeStatistics();
    // Written past the type rather than through it: nothing a statistics
    // report holds is anything but a counter or a group of them, and the walk
    // steps over whatever else it is handed rather than indexing it.
    Reflect.set(language, "sourceFiles", "many");
    const oddTarget: MeasuredTarget = { ...codebaseTarget, language };

    expect(() =>
      service.evaluate({
        configuration: buildConfiguration([
          buildLimit("codebase.sourceFiles", 1),
        ]),
        targets: [oddTarget],
      }),
    ).toThrow(UnboundMetricError);
  });

  it("refuses a path nothing measured answers to", () => {
    expect(() =>
      evaluate(buildLimit("codebase.typescript.traits", 10)),
    ).toThrow(UnboundMetricError);
  });

  it("refuses an unqualified path when no default target is configured", () => {
    expect(() => evaluate(buildLimit("typescript.interfaces", 10))).toThrow(
      /nothing measured answers to it. Measured targets: "codebase", "Compiled JavaScript"/,
    );
  });

  // The target ran size analysis alone, so its language counters were never
  // measured — a limit on one would otherwise be held against a zero.
  it("refuses a metric from an analysis the target never ran", () => {
    expect(() =>
      evaluate(buildLimit("Compiled JavaScript.typescript.interfaces", 10)),
    ).toThrow(UnboundMetricError);
  });

  it("refuses a default target that was never measured", () => {
    expect(() =>
      service.evaluate({
        configuration: buildConfiguration(
          [buildLimit("typescript.interfaces", 10)],
          "web",
        ),
        targets: [codebaseTarget],
      }),
    ).toThrow(/default target "web" was never measured/);
  });

  // A configuration that gates nothing has nothing to say about the targets,
  // so nothing about them can fail the run.
  it("leaves two targets sharing one name alone when nothing limits them", () => {
    expect(
      service.evaluate({
        configuration: buildConfiguration([]),
        targets: [codebaseTarget, codebaseTarget],
      }),
    ).toStrictEqual([]);
  });

  it("refuses two measured targets sharing one name", () => {
    expect(() =>
      service.evaluate({
        configuration: buildConfiguration([buildLimit("codebase.files", 10)]),
        targets: [codebaseTarget, codebaseTarget],
      }),
    ).toThrow(DuplicateTargetError);
  });

  it("fails a target that matched nothing while carrying a limit", () => {
    expect(() =>
      evaluate(buildLimit("Compiled JavaScript.size", 10_000), {
        targets: [codebaseTarget, { ...compiledTarget, files: 0 }],
      }),
    ).toThrow(EmptyTargetError);
  });

  // Without a limit there is nothing to assert the files exist, so an empty
  // match is a measurement of zero and unremarkable.
  it("leaves a target that matched nothing alone when nothing limits it", () => {
    const [evaluated] = service.evaluate({
      configuration: buildConfiguration([buildLimit("codebase.files", 20)]),
      targets: [codebaseTarget, { ...compiledTarget, files: 0 }],
    });

    expect(evaluated?.breached).toBe(false);
  });
});
