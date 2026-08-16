/**
 * Renders the pull request bundle size comment.
 *
 * Reads every `size-limit-report.json` the `bundlesize` target wrote, pairs
 * each entry with the same entry from a baseline snapshot downloaded from the
 * latest successful `main` run, and prints one markdown table grouped by
 * project.
 *
 * The baseline is an artifact rather than a second build of `main`: sizing the
 * base branch used to cost a full extra checkout, install, and build on every
 * pull request.
 *
 * Usage:
 *   tsx scripts/report-bundle-sizes.ts [--baseline <dir>] [--output <file>]
 */
import { globSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// 🏷️ Types

/** A measured bundle joined to its project and baseline. */
interface BundleRow {
  baseSize: number | undefined;
  name: string;
  passed: boolean;
  project: string;
  size: number;
  sizeLimit: number | undefined;
}

/** One measured bundle, as `size-limit --json` emits it. */
interface SizeLimitEntry {
  name: string;
  passed?: boolean;
  size: number;
  sizeLimit?: number;
}

// ♟️ Constants

/** Fraction of growth above which an increase is called out rather than noted. */
const SIGNIFICANT_GROWTH = 0.05;

const REPORT_GLOBS = [
  "applications/*/size-limit-report.json",
  "packages/*/size-limit-report.json",
  "tools/*/size-limit-report.json",
];

// 🔧 Utilities

/** Joins the current reports to the baseline snapshot. */
function collectRows(baselineDirectory: string | undefined): BundleRow[] {
  const rows: BundleRow[] = [];

  for (const reportPath of REPORT_GLOBS.flatMap((pattern) =>
    globSync(pattern),
  ).toSorted()) {
    const project = readProjectName(reportPath);
    const baseline = new Map<string, number>();

    if (baselineDirectory !== undefined) {
      for (const entry of readReport(
        path.join(baselineDirectory, reportPath),
      )) {
        baseline.set(entry.name, entry.size);
      }
    }

    for (const entry of readReport(reportPath)) {
      rows.push({
        baseSize: baseline.get(entry.name),
        name: entry.name,
        passed: entry.passed !== false,
        project,
        size: entry.size,
        sizeLimit: entry.sizeLimit,
      });
    }
  }

  return rows;
}

/** Formats a signed delta, or an em dash when there is no baseline. */
function formatDelta(delta: number | undefined): string {
  if (delta === undefined) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${formatKilobytes(delta)}`;
}

/** Formats a byte count as kilobytes. */
function formatKilobytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

/** Formats a signed percentage, or an em dash when there is no baseline. */
function formatPercent(fraction: number | undefined): string {
  if (fraction === undefined) return "—";
  const sign = fraction >= 0 ? "+" : "";
  return `${sign}${(fraction * 100).toFixed(1)}%`;
}

/** Reads `--flag value` pairs out of argv. */
function readOption(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

/** Picks the icon for the report as a whole. */
function readOverallStatus(
  rows: BundleRow[],
  delta: number | undefined,
  fraction: number | undefined,
): string {
  if (rows.some((row) => !row.passed)) return "❌";
  if (delta === undefined || delta <= 0) return "✅";
  return (fraction ?? 0) > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
}

/** Derives the Nx project name from a report path. */
function readProjectName(reportPath: string): string {
  return path.basename(path.dirname(reportPath));
}

// 🌎 Reporting

/** Parses a size-limit report, tolerating an absent or malformed file. */
function readReport(reportPath: string): SizeLimitEntry[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(reportPath, "utf8"));
    return Array.isArray(parsed) ? (parsed as SizeLimitEntry[]) : [];
  } catch {
    return [];
  }
}

/** Picks the status icon for one row. */
function readStatus(row: BundleRow): string {
  if (!row.passed) return "❌";
  if (row.baseSize === undefined) return "🆕";
  const delta = row.size - row.baseSize;
  if (delta <= 0) return "✅";
  const fraction = row.baseSize > 0 ? delta / row.baseSize : 0;
  return fraction > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
}

/** Renders the whole comment body. */
function renderReport(rows: BundleRow[], hasBaseline: boolean): string {
  if (rows.length === 0) {
    return [
      "## 📦 Bundle Size Report",
      "",
      "No bundles were measured for this change.",
    ].join("\n");
  }

  const total = rows.reduce((sum, row) => sum + row.size, 0);
  const projectCount = new Set(rows.map((row) => row.project)).size;
  const { delta, fraction } = summarizeRows(rows, hasBaseline);
  const overall = readOverallStatus(rows, delta, fraction);
  const comparison = hasBaseline
    ? `(${formatDelta(delta)}, ${formatPercent(fraction)} vs \`main\`)`
    : "(no `main` baseline available yet)";

  const summary =
    `${overall} **${formatKilobytes(total)}** across ${rows.length} bundles ` +
    `in ${projectCount} projects ${comparison}`;

  return [
    "## 📦 Bundle Size Report",
    "",
    summary,
    "",
    "| | Project | Bundle | Size | Base | Diff | % | Limit |",
    "|--|---------|--------|------|------|------|---|-------|",
    ...rows.map((row) => renderRow(row)),
    "",
    "<details>",
    "<summary>📊 Guidelines</summary>",
    "",
    "- ✅ Size decreased or unchanged",
    "- ⚠️ Increased under 5%",
    "- 📈 Increased 5% or more",
    "- 🆕 No baseline for this bundle",
    "- ❌ Exceeds its configured limit",
    "",
    "Add a `.size-limit.cjs` and a `bundlesize` target to a project to include",
    "it here.",
    "</details>",
    "",
    "---",
    "*Updated automatically when you push new commits.*",
  ].join("\n");
}

/** Renders one table row. */
function renderRow(row: BundleRow): string {
  const delta =
    row.baseSize === undefined ? undefined : row.size - row.baseSize;
  const fraction =
    delta === undefined || row.baseSize === undefined || row.baseSize === 0
      ? undefined
      : delta / row.baseSize;

  const cells = [
    readStatus(row),
    `\`${row.project}\``,
    row.name,
    formatKilobytes(row.size),
    row.baseSize === undefined ? "—" : formatKilobytes(row.baseSize),
    formatDelta(delta),
    formatPercent(fraction),
    row.sizeLimit === undefined ? "—" : formatKilobytes(row.sizeLimit),
  ];

  return `| ${cells.join(" | ")} |`;
}

/**
 * Totals the rows that have a baseline, so a newly added bundle does not read
 * as workspace-wide growth.
 */
function summarizeRows(
  rows: BundleRow[],
  hasBaseline: boolean,
): { delta: number | undefined; fraction: number | undefined } {
  if (!hasBaseline) return { delta: undefined, fraction: undefined };

  const comparable = rows.filter((row) => row.baseSize !== undefined);
  const baseTotal = comparable.reduce(
    (sum, row) => sum + (row.baseSize ?? 0),
    0,
  );
  const delta = comparable.reduce((sum, row) => sum + row.size, 0) - baseTotal;

  return { delta, fraction: baseTotal === 0 ? undefined : delta / baseTotal };
}

const baselineDirectory = readOption("--baseline");
const outputFile = readOption("--output");
const rows = collectRows(baselineDirectory);
const hasBaseline = rows.some((row) => row.baseSize !== undefined);
const report = renderReport(rows, hasBaseline);

if (outputFile === undefined) {
  process.stdout.write(`${report}\n`);
} else {
  writeFileSync(outputFile, `${report}\n`, "utf8");
}

const stepSummary = process.env["GITHUB_STEP_SUMMARY"];
if (stepSummary !== undefined && stepSummary !== "") {
  writeFileSync(stepSummary, `${report}\n`, { encoding: "utf8", flag: "a" });
}
