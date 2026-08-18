// ♟️ Constants

/**
 * Where a `bundlesize` target leaves its report.
 *
 * One glob per workspace directory rather than a single recursive sweep, so a
 * stray report inside `node_modules` or a build output directory cannot be
 * mistaken for a project's own measurement.
 */
export const REPORT_GLOBS = [
  "applications/*/size-limit-report.json",
  "packages/*/size-limit-report.json",
  "tools/*/size-limit-report.json",
];
