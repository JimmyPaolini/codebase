// ♟️ Constants

/** Heading the rendered section is filed under. */
export const HEADING = "## ⏲️ Codometer";

/**
 * The block this report claims inside a shared document. HTML comments are
 * invisible once the markdown is rendered, and every other report claims its
 * own pair, so several can sit in one document without collision.
 */
export const CODOMETER_MARKERS = {
  end: "<!-- codometer-changes:end -->",
  start: "<!-- codometer-changes:start -->",
};

/** Column headers for a project's metrics table. */
export const TABLE_HEADER = [
  "| | Metric | Value | `main` | Change |",
  "|--|--------|-------|--------|--------|",
];

/**
 * The most rows a report ever renders, across every project combined.
 *
 * A pull request description is passed to shell tooling as a single
 * environment variable, which has an OS-level size ceiling; a run with no
 * baseline to compare against — the first run against a project, or the
 * first run after a baseline goes missing — can otherwise flag every metric
 * a project measures at once and blow well past it. Breaches are exempt: a
 * breach must never sit behind a click, however many of them there are.
 */
export const MAX_TOTAL_ROWS = 200;
