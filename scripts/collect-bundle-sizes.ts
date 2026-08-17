/**
 * Collects the bundle measurements the `🎒 Bundles` section renders.
 *
 * Reads every `size-limit-report.json` the `bundlesize` target wrote and pairs
 * each entry with the same entry from a baseline snapshot downloaded from the
 * latest successful `main` run.
 *
 * Because CI runs `nx affected`, a pull request measures only the projects it
 * touched. Bundles the baseline knows about but this run did not rebuild are
 * still collected — flagged as unmeasured, carrying their `main` size — so the
 * report can cover the whole workspace instead of only the change's blast
 * radius.
 *
 * See `scripts/report-bundle-sizes.ts` for the rendering half.
 */
import { globSync, readFileSync } from "node:fs";
import path from "node:path";

// 🏷️ Types

/** A measured bundle joined to its project and baseline. */
export interface BundleRow {
  baseSize: number | undefined;
  /** False when this run did not rebuild the project, so `main` sizes stand in. */
  measured: boolean;
  /** True when size-limit matched no files, which means a broken `path` glob. */
  missing: boolean;
  name: string;
  passed: boolean;
  project: string;
  /** True when the baseline had this bundle and the current build does not. */
  removed: boolean;
  size: number;
  sizeLimit: number | undefined;
}

/** One measured bundle, as `size-limit --json` emits it. */
interface SizeLimitEntry {
  name: string;
  passed?: boolean;
  size?: number;
  sizeLimit?: number;
}

// ♟️ Constants

const REPORT_GLOBS = [
  "applications/*/size-limit-report.json",
  "packages/*/size-limit-report.json",
  "tools/*/size-limit-report.json",
];

// 🌎 Collection

/** Joins every current report to the baseline snapshot. */
export function collectRows(
  baselineDirectory: string | undefined,
): BundleRow[] {
  return readReportPaths(baselineDirectory).flatMap((reportPath) =>
    collectProjectRows(baselineDirectory, reportPath),
  );
}

/**
 * True when this run rebuilt the bundle and the baseline knew it, which is the
 * only case where a change is like-for-like.
 *
 * Totals must be built from these rows alone. A bundle that was renamed shows up
 * as one removal and one addition, and counting the removal without its
 * replacement turns a rename into a phantom saving.
 */
export function isComparable(row: BundleRow): boolean {
  return row.measured && row.baseSize !== undefined;
}

/**
 * The byte change against the baseline, when both sizes are known. A removed
 * bundle counts as a saving of its whole baseline size.
 */
export function readDelta(row: BundleRow): number | undefined {
  if (row.baseSize === undefined) return undefined;
  if (!row.measured && !row.removed) return undefined;
  return row.size - row.baseSize;
}

/** The proportional change against the baseline, when it is meaningful. */
export function readFraction(row: BundleRow): number | undefined {
  const delta = readDelta(row);
  if (delta === undefined || row.baseSize === undefined || row.baseSize === 0) {
    return undefined;
  }
  return delta / row.baseSize;
}

/** Builds the row for a bundle only the baseline knows about. */
function buildBaselineRow(
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
    size: removed ? 0 : (entry.size ?? 0),
    sizeLimit: entry.sizeLimit,
  };
}

/** Builds the row for a bundle this run measured. */
function buildMeasuredRow(
  entry: SizeLimitEntry,
  baseline: SizeLimitEntry | undefined,
  project: string,
): BundleRow {
  const size = entry.size ?? 0;

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
 * Joins one project's current report to its baseline. A baseline bundle with no
 * current counterpart was removed when this run rebuilt the project, and merely
 * skipped when it did not.
 */
function collectProjectRows(
  baselineDirectory: string | undefined,
  reportPath: string,
): BundleRow[] {
  const project = readProjectName(reportPath);
  const baseline = readBaseline(baselineDirectory, reportPath);
  const entries = readReport(reportPath);

  const rows = entries.map((entry) =>
    buildMeasuredRow(entry, baseline.get(entry.name), project),
  );
  const seen = new Set(rows.map((row) => row.name));

  for (const [name, entry] of baseline) {
    if (seen.has(name)) continue;
    rows.push(buildBaselineRow(entry, project, entries.length > 0));
  }

  return rows;
}

/** Reads a baseline report into a name-to-entry lookup. */
function readBaseline(
  baselineDirectory: string | undefined,
  reportPath: string,
): Map<string, SizeLimitEntry> {
  if (baselineDirectory === undefined) return new Map();
  const entries = readReport(path.join(baselineDirectory, reportPath));
  return new Map(entries.map((entry) => [entry.name, entry]));
}

/** Derives the Nx project name from a report path. */
function readProjectName(reportPath: string): string {
  return path.basename(path.dirname(reportPath));
}

/** Parses a size-limit report, tolerating an absent or malformed file. */
function readReport(reportPath: string): SizeLimitEntry[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(reportPath, "utf8"));
    return Array.isArray(parsed) ? (parsed as SizeLimitEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Lists every report path either side knows about, so a project the baseline
 * measured is still accounted for when this run skipped it.
 */
function readReportPaths(baselineDirectory: string | undefined): string[] {
  const current = REPORT_GLOBS.flatMap((pattern) => globSync(pattern));
  const baseline =
    baselineDirectory === undefined
      ? []
      : REPORT_GLOBS.flatMap((pattern) =>
          globSync(path.join(baselineDirectory, pattern)),
        ).map((reportPath) => path.relative(baselineDirectory, reportPath));

  return [...new Set([...current, ...baseline])].toSorted();
}
