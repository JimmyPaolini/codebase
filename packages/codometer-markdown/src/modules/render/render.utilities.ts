import type { MetricRow, MetricUnit } from "@codometer/changes";

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

/** Formats a plain count, grouped with the reader's locale separators. */
export function formatCount(value: number): string {
  return value.toLocaleString();
}

/** Formats a signed delta, or an em dash when there is nothing to compare. */
export function formatDelta(
  delta: number | undefined,
  unit: MetricUnit,
): string {
  if (delta === undefined) return "—";
  const formatted = formatValue(delta, unit);
  return delta >= 0 ? `+${formatted}` : formatted;
}

/** Formats a value the way its unit calls for. */
export function formatValue(value: number, unit: MetricUnit): string {
  return unit === "bytes" ? formatBytes(value) : formatCount(value);
}

/**
 * Whether a metric changed since the baseline, or is breaching a limit right
 * now regardless of whether it moved.
 *
 * A row that neither changed nor breaches anything has nothing to tell a
 * reviewer, so it never reaches the table. A brand-new metric — one with no
 * baseline at all — always counts as changed, since "appeared" is a change.
 */
export function hasChanged(row: MetricRow): boolean {
  return (
    row.breach !== undefined ||
    row.baseValue === undefined ||
    row.value !== row.baseValue
  );
}
