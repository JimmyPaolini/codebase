import { globSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  BYTES_UNIT,
  codometerReportSchema,
  REPORT_GLOBS,
} from "./bundles.constants";

import type {
  CollectProjectRowsArguments,
  CollectRowsArguments,
  MetricCollection,
  MetricRow,
  MetricSeverity,
  ProjectReport,
  ReportLimit,
  ReportTarget,
  SizeMetric,
} from "./bundles.types";

/**
 * Reads what each project's codometer run measured and joins it to a baseline.
 *
 * Codometer is stateless: it measures the tree in front of it and never looks
 * at another branch. Comparing two runs is this tool's job, because a baseline
 * needs branches, workflow artifacts, and pull request context — exactly the
 * knowledge a measurement tool has to stay free of.
 *
 * The baseline is a snapshot downloaded from the latest successful `main` run
 * rather than a second build of the base branch, which used to cost a full
 * extra checkout, install, and build on every pull request.
 *
 * Because CI runs `nx affected`, a pull request measures only the projects it
 * touched. Metrics the baseline knows about but this run did not rebuild are
 * still collected — flagged as unmeasured, carrying their `main` size — so a
 * report can cover the whole workspace instead of only the change's blast
 * radius.
 */
@Injectable()
export class BundlesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds the row for a metric only the baseline knows about.
   *
   * Its numbers come from `main`, so its verdicts are dropped: `breach` and
   * `empty` are cleared rather than spread through. A pull request that never
   * rebuilt a project must not be marked by what that project was doing on
   * `main` — otherwise a limit breached there marks every unrelated pull
   * request, and the row explaining it is not even on screen, because an
   * unmeasured row lives in the collapsed table and a removed one prints 🗑️.
   *
   * The same reasoning drops the baseline's failures in `readBaseline`. Both
   * exist to keep this change's status derived from this change.
   */
  private buildBaselineRow(
    metric: SizeMetric,
    project: string,
    removed: boolean,
  ): MetricRow {
    return {
      ...metric,
      baseSize: metric.size,
      breach: undefined,
      empty: false,
      measured: false,
      project,
      removed,
      size: removed ? 0 : metric.size,
    };
  }

  /** Builds the row for a metric this run measured. */
  private buildMeasuredRow(
    metric: SizeMetric,
    baseline: SizeMetric | undefined,
    project: string,
  ): MetricRow {
    return {
      ...metric,
      baseSize: baseline?.size,
      measured: true,
      project,
      removed: false,
    };
  }

  /**
   * Joins one project's current report to its baseline.
   *
   * A baseline metric with no current counterpart was removed when this run
   * rebuilt the project, and merely skipped when it did not.
   */
  private collectProjectRows(
    args: CollectProjectRowsArguments,
  ): MetricCollection {
    const project = this.readProjectName(args.reportPath);
    const baseline = this.readBaseline(args);
    const { failures, metrics } = this.readReport(
      args.workingDirectory,
      args.reportPath,
    );

    const rows = metrics.map((metric) =>
      this.buildMeasuredRow(metric, baseline.get(metric.name), project),
    );
    const seen = new Set(rows.map((row) => row.name));

    for (const [name, metric] of baseline) {
      if (seen.has(name)) continue;
      rows.push(this.buildBaselineRow(metric, project, metrics.length > 0));
    }

    return {
      failures: failures.map((failure) => ({ ...failure, project })),
      rows,
    };
  }

  /** Reads a baseline report into a name-to-metric lookup. */
  private readBaseline(
    args: CollectProjectRowsArguments,
  ): Map<string, SizeMetric> {
    if (args.baselineDirectory === undefined) return new Map();
    // Only the sizes are taken from the baseline. Whatever the run on `main`
    // could not measure is that run's problem and was reported there; repeating
    // it here would blame this change for it.
    const { metrics } = this.readReport(
      args.workingDirectory,
      path.join(args.baselineDirectory, args.reportPath),
    );
    return new Map(metrics.map((metric) => [metric.name, metric]));
  }

  /**
   * The severity of the worst limit a metric breached, if it breached one.
   *
   * A failing breach outranks an advisory one, so a metric that passed its
   * ceiling while also passing an advisory limit below it reads as failing
   * rather than as merely advised.
   */
  private readBreach(
    limits: readonly ReportLimit[],
  ): MetricSeverity | undefined {
    const breached = limits.filter((limit) => limit.breached);

    if (breached.length === 0) return undefined;

    return breached.some((limit) => limit.severity === "fail")
      ? "fail"
      : "warn";
  }

  /**
   * The ceiling a metric is actually held to.
   *
   * The lowest `fail` limit, because that is the one that stops a change, and
   * the lowest of them when several are written because that is the one that
   * binds first. A metric limited only by advice falls back to its lowest
   * `warn` limit — the only ceiling it has — rather than reporting none.
   */
  private readGoverningLimit(
    limits: readonly ReportLimit[],
  ): number | undefined {
    const failing = limits.filter((limit) => limit.severity === "fail");
    const governing = failing.length > 0 ? failing : limits;
    const values = governing.map((limit) => limit.value);

    return values.length === 0 ? undefined : Math.min(...values);
  }

  /** The first label any limit wrote, which names the row in the table. */
  private readLabel(limits: readonly ReportLimit[]): string | undefined {
    return limits.find((limit) => limit.label !== null)?.label ?? undefined;
  }

  /** Derives the Nx project name from a report path. */
  private readProjectName(reportPath: string): string {
    return path.basename(path.dirname(reportPath));
  }

  /** Parses a codometer report, tolerating an absent or malformed file. */
  private readReport(
    workingDirectory: string,
    reportPath: string,
  ): ProjectReport {
    const empty: ProjectReport = { failures: [], metrics: [] };

    try {
      const parsed = codometerReportSchema.safeParse(
        JSON.parse(
          readFileSync(path.join(workingDirectory, reportPath), "utf8"),
        ),
      );
      if (!parsed.success) return empty;

      return {
        failures: parsed.data.failures ?? [],
        metrics: parsed.data.targets.flatMap((target) =>
          this.readSizeMetrics(target),
        ),
      };
    } catch {
      return empty;
    }
  }

  /**
   * Lists every report path either side knows about, so a project the baseline
   * measured is still accounted for when this run skipped it.
   */
  private readReportPaths(args: CollectRowsArguments): string[] {
    const { baselineDirectory, workingDirectory } = args;
    const current = REPORT_GLOBS.flatMap((pattern) =>
      globSync(pattern, { cwd: workingDirectory }),
    );
    const baseline =
      baselineDirectory === undefined
        ? []
        : REPORT_GLOBS.flatMap((pattern) =>
            globSync(path.join(baselineDirectory, pattern), {
              cwd: workingDirectory,
            }),
          ).map((reportPath) => path.relative(baselineDirectory, reportPath));

    return [...new Set([...current, ...baseline])].toSorted();
  }

  /**
   * Pulls one target's byte-counting metrics out of the report.
   *
   * A codometer report carries everything a project measures — files, symbols,
   * lines — and a size table wants only the numbers denominated in bytes, which
   * the report says outright rather than leaving to be guessed from a name.
   *
   * The row is labelled with whatever the limit was written under, falling back
   * to the target's own name. The metric's name stays the join key either way,
   * so relabelling a limit never reads as a removal plus an addition.
   */
  private readSizeMetrics(target: ReportTarget): SizeMetric[] {
    return target.metrics
      .filter((metric) => metric.unit === BYTES_UNIT)
      .map((metric) => ({
        breach: this.readBreach(metric.limits),
        empty: target.empty,
        label: this.readLabel(metric.limits) ?? target.name,
        limit: this.readGoverningLimit(metric.limits),
        name: metric.name,
        size: metric.value,
      }));
  }

  // 🌎 Public Methods

  /** Joins every current report to the baseline snapshot. */
  collect(args: CollectRowsArguments): MetricCollection {
    const collections = this.readReportPaths(args).map((reportPath) =>
      this.collectProjectRows({ ...args, reportPath }),
    );

    return {
      failures: collections.flatMap((collection) => collection.failures),
      rows: collections.flatMap((collection) => collection.rows),
    };
  }
}
