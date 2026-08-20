import { z } from "zod";

// ♟️ Constants

/**
 * Metric unit whose value counts bytes.
 *
 * The only unit this report renders. Every other metric codometer measures
 * counts things — files, symbols, lines — and has no place in a size table.
 */
export const BYTES_UNIT = "bytes";

/**
 * Where a project's codometer run leaves its report.
 *
 * One glob per workspace directory rather than a single recursive sweep, so a
 * stray report inside `node_modules` or a build output directory cannot be
 * mistaken for a project's own measurement.
 */
export const REPORT_GLOBS = [
  "applications/*/codometer-report.json",
  "packages/*/codometer-report.json",
  "tools/*/codometer-report.json",
];

/**
 * The shape of a codometer report, as far as this report reads it.
 *
 * Validated rather than asserted: the file is output this tool does not
 * produce, and a malformed one should read as "nothing measured" instead of
 * flowing through as untyped data.
 *
 * Nothing here is inferred from an absent field. A target says outright whether
 * its globs matched anything, and a metric nobody limited carries an explicit
 * `null` rather than no limit key at all — which is what lets a target that
 * matched no files read differently from one that genuinely measured zero
 * bytes.
 *
 * `failures` is read for the same reason. A target the run could not measure
 * contributes no row, and a table that silently holds fewer rows than the
 * workspace has targets is a number that looks right only because whatever
 * would have contradicted it is missing.
 */
export const codometerReportSchema = z.object({
  failures: z
    .array(
      z.object({
        kind: z.enum(["limit", "target"]),
        reason: z.string(),
        subject: z.string(),
      }),
    )
    .optional(),
  targets: z.array(
    z.object({
      empty: z.boolean(),
      metrics: z.array(
        z.object({
          limits: z.array(
            z.object({
              breached: z.boolean(),
              label: z.string().nullable(),
              severity: z.enum(["fail", "warn"]),
              value: z.number(),
            }),
          ),
          name: z.string(),
          unit: z.literal(BYTES_UNIT).nullable(),
          value: z.number(),
        }),
      ),
      name: z.string(),
    }),
  ),
});
