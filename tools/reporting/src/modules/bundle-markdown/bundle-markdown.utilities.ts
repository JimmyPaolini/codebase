import type { MetricRow } from "../bundles/bundles.types";
import type { ProjectGroup } from "./bundle-markdown.types";

/**
 * Formats a byte count, switching to megabytes once kilobytes get unwieldy.
 *
 * Kilobytes are decimal, matching what codometer parses out of a limit written
 * as `"8 KB"`. Dividing by 1024 here would print a limit as a number the
 * configuration never mentions.
 */
export function formatBytes(bytes: number): string {
  if (Math.abs(bytes) >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  return `${(bytes / 1000).toFixed(2)} kB`;
}

/** Formats a count with its noun, pluralized. */
export function formatCount(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Formats a signed delta, or an em dash when there is no baseline. */
export function formatDelta(delta: number | undefined): string {
  if (delta === undefined) return "—";
  return `${delta >= 0 ? "+" : ""}${formatBytes(delta)}`;
}

/** Formats a signed percentage, or an em dash when there is no baseline. */
export function formatPercent(fraction: number | undefined): string {
  if (fraction === undefined) return "—";
  return `${fraction >= 0 ? "+" : ""}${(fraction * 100).toFixed(1)}%`;
}

/**
 * Formats how much of its limit a metric consumes.
 *
 * Only the share, with nothing appended. How close to full is worth warning
 * about is a question the configuration answers with a `warn`-severity limit —
 * declared, visible, and per project — rather than one this renderer answers
 * with a constant nobody can see or change.
 */
export function formatUsage(row: MetricRow): string {
  if (row.limit === undefined || row.limit === 0) return "—";
  return `${((row.size / row.limit) * 100).toFixed(0)}%`;
}

/** Groups rows by project, preserving the order each report declared. */
export function groupByProject(rows: readonly MetricRow[]): ProjectGroup[] {
  const groups = new Map<string, MetricRow[]>();

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
