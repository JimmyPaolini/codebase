import { z } from "zod";

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

/**
 * The shape of a `size-limit --json` report.
 *
 * Validated rather than asserted: the file is build output this tool does not
 * produce, and a malformed one should read as "nothing measured" instead of
 * flowing through as untyped data. `size` is absent when a `path` glob matched
 * no files.
 */
export const sizeLimitReportSchema = z.array(
  z.object({
    name: z.string(),
    passed: z.boolean().optional(),
    size: z.number().optional(),
    sizeLimit: z.number().optional(),
  }),
);
