/**
 * Renders the pull request bundle size comment.
 *
 * Takes the rows `scripts/collect-bundle-sizes.ts` gathered and prints one
 * markdown table grouped by project, plus a headline total, a callout for the
 * bundle that grew most, and a collapsed list of the projects `nx affected`
 * did not rebuild.
 *
 * The baseline is an artifact rather than a second build of `main`: sizing the
 * base branch used to cost a full extra checkout, install, and build on every
 * pull request.
 *
 * Usage:
 *   tsx scripts/report-bundle-sizes.ts [--baseline <dir>] [--output <file>]
 *     [--baseline-url <url>]
 */
import { writeFileSync } from "node:fs";

import {
  type BundleRow,
  collectRows,
  readDelta,
  readFraction,
} from "./collect-bundle-sizes.js";

// 🏷️ Types

/** A project's bundles, kept in the order its `.size-limit.cjs` declares them. */
interface ProjectGroup {
  project: string;
  rows: BundleRow[];
}

/** Workspace-wide totals, and the change against the baseline. */
interface SizeSummary {
  delta: number | undefined;
  fraction: number | undefined;
  total: number;
}

// ♟️ Constants

/** Fraction of a limit above which a bundle is called out as nearly full. */
const CROWDED_LIMIT = 0.9;

/** Fraction of growth above which an increase is called out rather than noted. */
const SIGNIFICANT_GROWTH = 0.05;

const TABLE_HEADER = [
  "| | Project | Bundle | Size | `main` | Diff | % | Limit | Used |",
  "|--|---------|--------|------|--------|------|---|-------|------|",
];

// 🔧 Formatting

/** Formats a byte count, switching to megabytes once kilobytes get unwieldy. */
function formatBytes(bytes: number): string {
  if (Math.abs(bytes) >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  return `${(bytes / 1000).toFixed(2)} kB`;
}

/** Formats a count with its noun, pluralized. */
function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Formats a signed delta, or an em dash when there is no baseline. */
function formatDelta(delta: number | undefined): string {
  if (delta === undefined) return "—";
  return `${delta >= 0 ? "+" : ""}${formatBytes(delta)}`;
}

/** Formats a signed percentage, or an em dash when there is no baseline. */
function formatPercent(fraction: number | undefined): string {
  if (fraction === undefined) return "—";
  return `${fraction >= 0 ? "+" : ""}${(fraction * 100).toFixed(1)}%`;
}

/** Formats how much of a bundle's limit it consumes, flagging a near-full one. */
function formatUsage(row: BundleRow): string {
  if (row.sizeLimit === undefined || row.sizeLimit === 0) return "—";
  const usage = row.size / row.sizeLimit;
  const marker = row.passed && usage >= CROWDED_LIMIT ? " ❗" : "";
  return `${(usage * 100).toFixed(0)}%${marker}`;
}

/** Groups rows by project, preserving the order each report declared. */
function groupByProject(rows: readonly BundleRow[]): ProjectGroup[] {
  const groups = new Map<string, BundleRow[]>();

  for (const row of rows) {
    const existing = groups.get(row.project);
    if (existing === undefined) {
      groups.set(row.project, [row]);
    } else {
      existing.push(row);
    }
  }

  return [...groups].map(([project, projectRows]) => ({
    project,
    rows: projectRows,
  }));
}

// 📐 Statuses

/**
 * Finds the bundle that grew most, proportionally, for the callout line. Ties
 * break on absolute bytes, so uniform growth names the costliest bundle.
 */
function readBiggestGrowth(rows: readonly BundleRow[]): BundleRow | undefined {
  return rows
    .filter((row) => (readDelta(row) ?? 0) > 0)
    .toSorted(
      (first, second) =>
        (readFraction(second) ?? 0) - (readFraction(first) ?? 0) ||
        (readDelta(second) ?? 0) - (readDelta(first) ?? 0),
    )[0];
}

/** Picks the icon for a rebuilt bundle, from how far it moved. */
function readGrowthStatus(row: BundleRow): string {
  if (row.baseSize === undefined) return "🆕";
  if ((readDelta(row) ?? 0) <= 0) return "✅";
  return (readFraction(row) ?? 0) > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
}

/**
 * Reads `--flag value` pairs out of argv, treating an empty value as absent so
 * an unset workflow output does not become an empty markdown link.
 */
function readOption(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  return value === undefined || value === "" ? undefined : value;
}

/** Picks the icon for the report as a whole. */
function readOverallStatus(
  rows: readonly BundleRow[],
  summary: SizeSummary,
): string {
  if (rows.some((row) => !row.passed || row.missing)) return "❌";
  if (summary.delta === undefined || summary.delta <= 0) return "✅";
  return (summary.fraction ?? 0) > SIGNIFICANT_GROWTH ? "📈" : "⚠️";
}

/** Picks the status icon for one row. */
function readStatus(row: BundleRow): string {
  if (row.removed) return "🗑️";
  if (row.missing) return "⁉️";
  if (!row.passed) return "❌";
  if (!row.measured) return "💤";
  return readGrowthStatus(row);
}

// 🌎 Rendering

/** Renders the legend that explains every icon the table can show. */
function renderGuidelines(): string[] {
  return [
    "<details>",
    "<summary>📊 Guidelines</summary>",
    "",
    "- ✅ Size decreased or unchanged",
    "- ⚠️ Increased under 5%",
    "- 📈 Increased 5% or more",
    "- 🆕 No baseline for this bundle",
    "- 💤 Not rebuilt by this change, shown at its `main` size",
    "- 🗑️ Removed since the baseline",
    "- ❌ Exceeds its configured limit",
    "- ⁉️ Its `path` glob matched no files",
    "- ❗ Within 10% of its limit",
    "",
    "Sizes are gzipped. `Used` is the share of a bundle's limit it consumes.",
    "Packages declare their limit as `sizeLimit` in their package.json. Add a",
    "`.size-limit.cjs` and a `bundlesize` target to a project to include it here.",
    "</details>",
    "",
  ];
}

/** Renders the table of everything this run rebuilt. */
function renderMeasuredTable(rows: readonly BundleRow[]): string[] {
  const measured = rows.filter((row) => row.measured || row.removed);
  if (measured.length === 0) {
    return ["This change rebuilt no measured project.", ""];
  }

  return [
    ...TABLE_HEADER,
    ...groupByProject(measured).flatMap((group) => [
      ...group.rows.map((row) => renderRow(row)),
      ...renderSubtotal(group),
    ]),
    "",
  ];
}

/** Renders the whole comment body. */
function renderReport(
  rows: readonly BundleRow[],
  baselineUrl: string | undefined,
): string {
  if (rows.length === 0) {
    return [
      "## 📦 Bundle Size Report",
      "",
      "No bundles were measured for this change.",
    ].join("\n");
  }

  return [
    "## 📦 Bundle Size Report",
    "",
    ...renderSummary(rows, baselineUrl),
    ...renderMeasuredTable(rows),
    ...renderUnmeasured(rows),
    ...renderGuidelines(),
    "---",
    "*Updated automatically when you push new commits.*",
  ].join("\n");
}

/** Renders one table row. */
function renderRow(row: BundleRow): string {
  const cells = [
    readStatus(row),
    `\`${row.project}\``,
    row.removed ? `~~${row.name}~~` : row.name,
    row.removed ? "—" : formatBytes(row.size),
    row.baseSize === undefined ? "—" : formatBytes(row.baseSize),
    formatDelta(readDelta(row)),
    formatPercent(readFraction(row)),
    row.sizeLimit === undefined || row.removed
      ? "—"
      : formatBytes(row.sizeLimit),
    row.removed ? "—" : formatUsage(row),
  ];

  return `| ${cells.join(" | ")} |`;
}

/** Renders a project's rollup, which only earns its line when it has siblings. */
function renderSubtotal(group: ProjectGroup): string[] {
  if (group.rows.length < 2) return [];

  const total = group.rows.reduce((sum, row) => sum + row.size, 0);
  const baseTotal = group.rows.reduce(
    (sum, row) => sum + (row.baseSize ?? 0),
    0,
  );
  const comparable = group.rows.some((row) => readDelta(row) !== undefined);
  const delta = comparable ? total - baseTotal : undefined;
  const fraction =
    delta === undefined || baseTotal === 0 ? undefined : delta / baseTotal;

  const cells = [
    "",
    `\`${group.project}\``,
    `**${formatCount(group.rows.length, "bundle")}**`,
    `**${formatBytes(total)}**`,
    baseTotal === 0 ? "—" : formatBytes(baseTotal),
    formatDelta(delta),
    formatPercent(fraction),
    "",
    "",
  ];

  return [`| ${cells.join(" | ")} |`];
}

/** Renders the headline, and the callout for whatever grew most. */
function renderSummary(
  rows: readonly BundleRow[],
  baselineUrl: string | undefined,
): string[] {
  const summary = summarizeRows(rows);
  const bundleCount = rows.filter((row) => !row.removed).length;
  const projectCount = new Set(rows.map((row) => row.project)).size;
  const baseline =
    baselineUrl === undefined ? "`main`" : `[\`main\`](${baselineUrl})`;
  const comparison =
    summary.delta === undefined
      ? "(no `main` baseline available yet)"
      : `— ${formatDelta(summary.delta)} (${formatPercent(summary.fraction)}) vs ${baseline}`;

  const lines = [
    `${readOverallStatus(rows, summary)} **${formatBytes(summary.total)}** across ` +
      `${formatCount(bundleCount, "bundle")} in ` +
      `${formatCount(projectCount, "project")} ${comparison}`,
    "",
  ];

  const biggest = readBiggestGrowth(rows);
  if (biggest !== undefined) {
    lines.push(
      `**Biggest increase:** \`${biggest.project}\` ${biggest.name} ` +
        `${formatDelta(readDelta(biggest))} ` +
        `(${formatPercent(readFraction(biggest))})`,
      "",
    );
  }

  return lines;
}

/** Renders the collapsed list of projects `nx affected` skipped. */
function renderUnmeasured(rows: readonly BundleRow[]): string[] {
  const skipped = rows.filter((row) => !row.measured && !row.removed);
  if (skipped.length === 0) return [];

  const total = skipped.reduce((sum, row) => sum + row.size, 0);

  return [
    "<details>",
    `<summary>💤 Unchanged by this pull request — ${formatCount(skipped.length, "bundle")}, ${formatBytes(total)}</summary>`,
    "",
    "CI measures only the projects `nx affected` rebuilt. These kept their",
    "`main` sizes, and are counted in the total above.",
    "",
    "| Project | Bundle | Size on `main` | Limit |",
    "|---------|--------|----------------|-------|",
    ...skipped.map((row) => {
      const limit =
        row.sizeLimit === undefined ? "—" : formatBytes(row.sizeLimit);
      return `| \`${row.project}\` | ${row.name} | ${formatBytes(row.size)} | ${limit} |`;
    }),
    "</details>",
    "",
  ];
}

/**
 * Totals every bundle, and changes only those with a baseline, so a newly added
 * bundle does not read as workspace-wide growth.
 */
function summarizeRows(rows: readonly BundleRow[]): SizeSummary {
  const total = rows.reduce((sum, row) => sum + row.size, 0);
  const comparable = rows.filter((row) => readDelta(row) !== undefined);

  if (comparable.length === 0) {
    return { delta: undefined, fraction: undefined, total };
  }

  const baseTotal = comparable.reduce(
    (sum, row) => sum + (row.baseSize ?? 0),
    0,
  );
  const delta = comparable.reduce((sum, row) => sum + (readDelta(row) ?? 0), 0);

  return {
    delta,
    fraction: baseTotal === 0 ? undefined : delta / baseTotal,
    total,
  };
}

// 🏁 Entrypoint

const rows = collectRows(readOption("--baseline"));
const report = renderReport(rows, readOption("--baseline-url"));
const outputFile = readOption("--output");

if (outputFile === undefined) {
  process.stdout.write(`${report}\n`);
} else {
  writeFileSync(outputFile, `${report}\n`, "utf8");
}

const stepSummary = process.env["GITHUB_STEP_SUMMARY"];
if (stepSummary !== undefined && stepSummary !== "") {
  writeFileSync(stepSummary, `${report}\n`, { encoding: "utf8", flag: "a" });
}
