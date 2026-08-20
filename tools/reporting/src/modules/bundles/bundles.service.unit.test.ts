import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BundlesService } from "./bundles.service";

import type {
  CodometerReport,
  MetricSeverity,
  ReportLimit,
  ReportTarget,
} from "./bundles.types";

/** Overrides for the one size target most cases need. */
interface SizeTargetOverrides {
  breached?: boolean;
  empty?: boolean;
  label?: null | string;
  limit?: number | undefined;
  /** Written out in full when a case needs more than one limit on the metric. */
  limits?: ReportLimit[];
  name?: string;
  severity?: MetricSeverity;
  size?: number;
}

/** Builds a report around whichever targets a case declares. */
function buildReport(targets: ReportTarget[]): CodometerReport {
  return { targets };
}

/** Builds a target carrying a single byte-counting metric. */
function buildSizeTarget(overrides: SizeTargetOverrides = {}): ReportTarget {
  const {
    breached = false,
    empty = false,
    label = null,
    limit,
    name = "Compiled JavaScript",
    severity = "fail",
    size = 0,
  } = overrides;

  const limits =
    overrides.limits ??
    (limit === undefined ? [] : [{ breached, label, severity, value: limit }]);

  return {
    empty,
    metrics: [{ limits, name: `${name}.size`, unit: "bytes", value: size }],
    name,
  };
}

describe(BundlesService, () => {
  let service: BundlesService;
  const temporaryDirectories: string[] = [];

  /** Lays out codometer reports inside a throwaway workspace. */
  function writeWorkspace(
    reports: Record<string, CodometerReport | string>,
  ): string {
    const workingDirectory = mkdtempSync(
      path.join(tmpdir(), "codometer-bundles-"),
    );
    temporaryDirectories.push(workingDirectory);

    for (const [reportPath, report] of Object.entries(reports)) {
      const absolute = path.join(workingDirectory, reportPath);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(
        absolute,
        typeof report === "string" ? report : JSON.stringify(report),
        "utf8",
      );
    }

    return workingDirectory;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [BundlesService],
    }).compile();

    service = await module.resolve(BundlesService);
  });

  afterAll(() => {
    for (const directory of temporaryDirectories) {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a report from every workspace directory", () => {
    const workingDirectory = writeWorkspace({
      "applications/lexico/codometer-report.json": buildReport([
        buildSizeTarget({ limit: 200, name: "Client JS", size: 100 }),
      ]),
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 50 }),
      ]),
      "tools/synchronization/codometer-report.json": buildReport([
        buildSizeTarget({ size: 25 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(rows.map((row) => row.project)).toStrictEqual([
      "lexico",
      "logger",
      "synchronization",
    ]);
    expect(rows.every((row) => row.measured)).toBe(true);
    expect(rows.every((row) => row.baseSize === undefined)).toBe(true);
  });

  it("reads only the metrics denominated in bytes", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/codometer-report.json": {
        targets: [
          {
            empty: false,
            metrics: [
              {
                limits: [],
                name: "codebase.typescript.files",
                unit: null,
                value: 22,
              },
            ],
            name: "codebase",
          },
          buildSizeTarget({ size: 50 }),
        ],
      },
    });

    const rows = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(rows.map((row) => row.name)).toStrictEqual([
      "Compiled JavaScript.size",
    ]);
  });

  it("joins a measured metric to its baseline by name", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 40 }),
      ]),
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 50 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;

    expect(row?.baseSize).toBe(40);
    expect(row?.size).toBe(50);
    expect(row?.measured).toBe(true);
  });

  it("joins on the metric name even when the limit was relabelled", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ label: "Old label", limit: 100, size: 40 }),
      ]),
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ label: "New label", limit: 100, size: 50 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;

    expect(rows).toHaveLength(1);
    expect(rows[0]?.baseSize).toBe(40);
    expect(rows[0]?.label).toBe("New label");
  });

  it("labels a row with its target when the limit wrote no label", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ name: "Library bundle", size: 50 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.label).toBe("Library bundle");
    expect(row?.name).toBe("Library bundle.size");
  });

  it("marks a baseline metric the rebuild dropped as removed", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 40 }),
        buildSizeTarget({ name: "Retired", size: 10 }),
      ]),
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 50 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;
    const retired = rows.find((row) => row.label === "Retired");

    expect(retired?.removed).toBe(true);
    expect(retired?.size).toBe(0);
    expect(retired?.baseSize).toBe(10);
  });

  it("carries the baseline size for a project this run never rebuilt", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 40 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    }).rows;

    expect(row?.measured).toBe(false);
    expect(row?.removed).toBe(false);
    expect(row?.size).toBe(40);
  });

  it("distinguishes a target that matched nothing from one measuring zero", () => {
    const workingDirectory = writeWorkspace({
      "applications/lexico/codometer-report.json": buildReport([
        buildSizeTarget({ empty: true, size: 0 }),
      ]),
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ empty: false, size: 0 }),
      ]),
    });

    const rows = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(rows.map((row) => [row.project, row.empty, row.size])).toStrictEqual(
      [
        ["lexico", true, 0],
        ["logger", false, 0],
      ],
    );
  });

  it.each([
    { label: "malformed", report: "{ not json" },
    { label: "missing its targets", report: '{"failures":[]}' },
    { label: "shaped like the outgoing tool's", report: '[{"name":"x"}]' },
  ])("tolerates a report $label", ({ report }) => {
    const workingDirectory = writeWorkspace({
      "packages/logger/codometer-report.json": report,
    });

    expect(
      service.collect({ baselineDirectory: undefined, workingDirectory }),
    ).toStrictEqual({ failures: [], rows: [] });
  });

  it("leaves a metric nothing limits without a limit or a severity", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 90 }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.limit).toBeUndefined();
    expect(row?.breach).toBeUndefined();
  });

  it("reports a warn breach beside a fail that held as advisory, not passing", () => {
    // The case the plural report exists for: neither limit may mask the other.
    const workingDirectory = writeWorkspace({
      "packages/lexico-components/codometer-report.json": buildReport([
        buildSizeTarget({
          limits: [
            { breached: true, label: null, severity: "warn", value: 180_000 },
            { breached: false, label: null, severity: "fail", value: 200_000 },
          ],
          name: "Library bundle",
          size: 196_157,
        }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    // Advisory, not failing — and the enforced ceiling is still the fail limit.
    expect(row?.breach).toBe("warn");
    expect(row?.limit).toBe(200_000);
  });

  it("reports a breached fail beside a breached warn as failing", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({
          limits: [
            { breached: true, label: null, severity: "warn", value: 40 },
            { breached: true, label: null, severity: "fail", value: 50 },
          ],
          size: 90,
        }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.breach).toBe("fail");
    expect(row?.limit).toBe(50);
  });

  it("falls back to the advisory ceiling when nothing fails the metric", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({
          limits: [
            { breached: false, label: null, severity: "warn", value: 90 },
          ],
          size: 50,
        }),
      ]),
    });

    const [row] = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    }).rows;

    expect(row?.limit).toBe(90);
    expect(row?.breach).toBeUndefined();
  });

  it("carries a failure through, tagged with the project it came from", () => {
    const workingDirectory = writeWorkspace({
      "packages/logger/codometer-report.json": {
        failures: [
          {
            kind: "target",
            reason: "the build output is missing",
            subject: "Compiled JavaScript",
          },
        ],
        targets: [],
      },
    });

    const collection = service.collect({
      baselineDirectory: undefined,
      workingDirectory,
    });

    expect(collection.rows).toStrictEqual([]);
    expect(collection.failures).toStrictEqual([
      {
        kind: "target",
        project: "logger",
        reason: "the build output is missing",
        subject: "Compiled JavaScript",
      },
    ]);
  });

  it("ignores a failure the baseline run hit, which this change did not cause", () => {
    const workingDirectory = writeWorkspace({
      ".baseline/packages/logger/codometer-report.json": {
        failures: [
          { kind: "target", reason: "broken on main", subject: "Ghost" },
        ],
        targets: [buildSizeTarget({ size: 40 })],
      },
      "packages/logger/codometer-report.json": buildReport([
        buildSizeTarget({ size: 50 }),
      ]),
    });

    const collection = service.collect({
      baselineDirectory: ".baseline",
      workingDirectory,
    });

    expect(collection.failures).toStrictEqual([]);
    expect(collection.rows[0]?.baseSize).toBe(40);
  });

  it.each([{ severity: "fail" as const }, { severity: "warn" as const }])(
    "reports a breached $severity limit at that severity",
    ({ severity }) => {
      const workingDirectory = writeWorkspace({
        "packages/logger/codometer-report.json": buildReport([
          buildSizeTarget({ breached: true, limit: 50, severity, size: 90 }),
        ]),
      });

      const [row] = service.collect({
        baselineDirectory: undefined,
        workingDirectory,
      }).rows;

      expect(row?.breach).toBe(severity);
      expect(row?.limit).toBe(50);
    },
  );
});
