import { globSync, readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { REPORT_GLOBS, sizeLimitReportSchema } from "./bundles.constants";

import type {
  BundleRow,
  CollectProjectRowsArguments,
  CollectRowsArguments,
  SizeLimitEntry,
} from "./bundles.types";

/**
 * Reads what the `bundlesize` target measured and joins it to a baseline.
 *
 * The baseline is a snapshot downloaded from the latest successful `main` run
 * rather than a second build of the base branch, which used to cost a full
 * extra checkout, install, and build on every pull request.
 *
 * Because CI runs `nx affected`, a pull request measures only the projects it
 * touched. Bundles the baseline knows about but this run did not rebuild are
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

  /** Builds the row for a bundle only the baseline knows about. */
  private buildBaselineRow(
    entry: SizeLimitEntry,
    project: string,
    removed: boolean,
  ): BundleRow {
    return {
      baseSize: entry.size,
      measured: false,
      missing: false,
      name: entry.name,
      passed: true,
      project,
      removed,
      size: removed ? 0 : entry.size,
      sizeLimit: entry.sizeLimit,
    };
  }

  /** Builds the row for a bundle this run measured. */
  private buildMeasuredRow(
    entry: SizeLimitEntry,
    baseline: SizeLimitEntry | undefined,
    project: string,
  ): BundleRow {
    const { size } = entry;

    return {
      baseSize: baseline?.size,
      measured: true,
      missing: size === 0,
      name: entry.name,
      passed: entry.passed !== false,
      project,
      removed: false,
      size,
      sizeLimit: entry.sizeLimit,
    };
  }

  /**
   * Joins one project's current report to its baseline.
   *
   * A baseline bundle with no current counterpart was removed when this run
   * rebuilt the project, and merely skipped when it did not.
   */
  private collectProjectRows(args: CollectProjectRowsArguments): BundleRow[] {
    const project = this.readProjectName(args.reportPath);
    const baseline = this.readBaseline(args);
    const entries = this.readReport(args.workingDirectory, args.reportPath);

    const rows = entries.map((entry) =>
      this.buildMeasuredRow(entry, baseline.get(entry.name), project),
    );
    const seen = new Set(rows.map((row) => row.name));

    for (const [name, entry] of baseline) {
      if (seen.has(name)) continue;
      rows.push(this.buildBaselineRow(entry, project, entries.length > 0));
    }

    return rows;
  }

  /** Reads a baseline report into a name-to-entry lookup. */
  private readBaseline(
    args: CollectProjectRowsArguments,
  ): Map<string, SizeLimitEntry> {
    if (args.baselineDirectory === undefined) return new Map();
    const entries = this.readReport(
      args.workingDirectory,
      path.join(args.baselineDirectory, args.reportPath),
    );
    return new Map(entries.map((entry) => [entry.name, entry]));
  }

  /** Derives the Nx project name from a report path. */
  private readProjectName(reportPath: string): string {
    return path.basename(path.dirname(reportPath));
  }

  /** Parses a size-limit report, tolerating an absent or malformed file. */
  private readReport(
    workingDirectory: string,
    reportPath: string,
  ): SizeLimitEntry[] {
    try {
      const parsed = sizeLimitReportSchema.safeParse(
        JSON.parse(
          readFileSync(path.join(workingDirectory, reportPath), "utf8"),
        ),
      );
      if (!parsed.success) return [];

      return parsed.data.map((entry) => ({ ...entry, size: entry.size ?? 0 }));
    } catch {
      return [];
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

  // 🌎 Public Methods

  /** Joins every current report to the baseline snapshot. */
  collectRows(args: CollectRowsArguments): BundleRow[] {
    return this.readReportPaths(args).flatMap((reportPath) =>
      this.collectProjectRows({ ...args, reportPath }),
    );
  }
}
