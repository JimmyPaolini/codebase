// ♟️ Constants

import type { MeanderRecord } from "../database/database.types";
import type {
  ChangedMeanderDrift,
  MeanderDriftReport,
  MeanderKeySummary,
} from "./draw-check.types";

/**
 * The TypeORM connection name `DrawCheckSweepModule`'s throwaway
 * `TypeOrmModule.forRoot()` registers under, and the name
 * `DrawCheckService.check` reads its regenerated repository back with.
 *
 * Without this, both the throwaway context and the already-open committed
 * connection register under TypeORM's default name in the same process,
 * which `DataSourceNameRegistry` only warns about rather than refusing —
 * the two connections are alive simultaneously for the whole of `check()`,
 * and the collision intermittently crashes `NestFactory.createApplicationContext`
 * outright under load instead of merely producing a wrong result.
 */
export const DRAW_CHECK_SWEEP_CONNECTION_NAME = "draw-check-sweep";

/**
 * Every column `DrawCheckService.diff` compares between a regenerated row and
 * its committed counterpart, besides the three that already form the
 * lattice address (`code`, `columns`, `rows`) and the database's own
 * auto-generated `id`, which two independent rows for the same meander are
 * never expected to share.
 *
 * Reads `MeanderRecord` rather than the `Meander` entity so the list can
 * never name a column the database itself does not have, and a
 * Characteristic column added later only has to be added here to be covered.
 */
export const MEANDER_DRIFT_COMPARISON_COLUMNS = [
  "components",
  "cycles",
  "characteristics",
  "families",
  "freeEnds",
  "inkTJunctions",
  "inkXJunctions",
  "pitch",
  "provenance",
  "drawingHash",
] as const satisfies readonly (keyof MeanderRecord)[];

/**
 * How many offending Codes `MeanderDriftDetectedError` names per category —
 * new, missing, and changed — so its message stays readable no matter how
 * much a regenerated sweep disagrees with the committed database.
 */
const MEANDER_DRIFT_SAMPLE_SIZE = 5;

// 🚨 Errors

/**
 * Thrown by `DrawCheckService.check` when a freshly regenerated sweep
 * disagrees with the committed database in any way: a row the sweep found
 * that the database lacks, a row the database holds that the sweep no longer
 * finds, or a row both agree exists but disagree on the content of. Named
 * Codes rather than a bare count, so whoever reads a failed CI run knows
 * where to look without re-running the check with more logging turned on.
 */
export class MeanderDriftDetectedError extends Error {
  constructor(report: MeanderDriftReport) {
    super(MeanderDriftDetectedError.describe(report));
    this.name = "MeanderDriftDetectedError";
  }

  /** One line per category, each naming up to `MEANDER_DRIFT_SAMPLE_SIZE` offending Codes. */
  private static describe(report: MeanderDriftReport): string {
    const counts = `${report.new.length} new, ${report.missing.length} missing, ${report.changed.length} changed`;
    const totals = `regenerated ${report.regeneratedCount}, committed ${report.committedCount}`;
    const samples = [
      ...report.new
        .slice(0, MEANDER_DRIFT_SAMPLE_SIZE)
        .map((entry) => MeanderDriftDetectedError.describeNew(entry)),
      ...report.missing
        .slice(0, MEANDER_DRIFT_SAMPLE_SIZE)
        .map((entry) => MeanderDriftDetectedError.describeMissing(entry)),
      ...report.changed
        .slice(0, MEANDER_DRIFT_SAMPLE_SIZE)
        .map((entry) => MeanderDriftDetectedError.describeChanged(entry)),
    ];

    return `meander drift detected against the committed database: ${counts} (${totals}) — ${samples.join("; ")}`;
  }

  /** One `changed` entry, as `code (rows x columns) [column, column]`. */
  private static describeChanged(entry: ChangedMeanderDrift): string {
    return `changed ${MeanderDriftDetectedError.describeKey(entry)} [${entry.differences.join(", ")}]`;
  }

  /** One `new`/`missing` entry, as `code (rows x columns)`. */
  private static describeKey(entry: MeanderKeySummary): string {
    return `${entry.code} (${entry.rows}x${entry.columns})`;
  }

  /** One `missing` entry, as `code (rows x columns)`. */
  private static describeMissing(entry: MeanderKeySummary): string {
    return `missing ${MeanderDriftDetectedError.describeKey(entry)}`;
  }

  /** One `new` entry, as `code (rows x columns)`. */
  private static describeNew(entry: MeanderKeySummary): string {
    return `new ${MeanderDriftDetectedError.describeKey(entry)}`;
  }
}
