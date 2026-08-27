// 🏷️ Types

import type { EvaluatedLimit, TargetMetricIndex } from "../limits/limits.types";
import type {
  DocumentationMeasurement,
  ReportFailure,
} from "../measure/measure.types";
import type { CodometerSeverity } from "@codometer/configuration";

/** Arguments accepted when building the report from one measurement. */
export interface BuildReportArguments {
  documentation: readonly DocumentationMeasurement[];
  failures: readonly ReportFailure[];
  /** Every metric each measured target counted, target by target. */
  indexes: ReadonlyMap<string, TargetMetricIndex>;
  limits: readonly EvaluatedLimit[];
}

/**
 * Everything one run measured, and everything it could not.
 *
 * Codometer's own shape rather than any other tool's. What a consumer needs is
 * every metric's value alongside whatever limits it, and a name it can join a
 * previous run's report on; nothing here is inferred from a field's absence.
 */
export interface CodometerReport {
  /**
   * Whatever the run could not do, named. Empty on an ordinary run.
   *
   * Present in the report rather than only on the console so that a consumer
   * reading the file can tell a metric nobody measured from one that measured
   * zero.
   */
  documentation: DocumentationMeasurement[];
  failures: ReportFailure[];
  targets: ReportTarget[];
}

/**
 * What a metric's number counts.
 *
 * Only bytes are called out. Every other metric counts things, and a count has
 * no unit to get wrong.
 */
export type MetricUnit = "bytes" | null;

/**
 * The limit declared on one metric, and whether the metric cleared it.
 *
 * A limit that held is written out exactly like one that did not, so a
 * consumer can render the headroom rather than only the failures.
 */
export interface ReportLimit {
  breached: boolean;
  /** Stays `null` when none was written; a renderer falls back to the path. */
  label: null | string;
  severity: CodometerSeverity;
  value: number;
}

/** One measured number, and whatever limits it. */
export interface ReportMetric {
  /**
   * Every limit declared on the metric, in the order they were written.
   *
   * A list because the configuration accepts more than one limit on a single
   * metric on purpose — a `warn` short of a `fail` is how a repository sees a
   * number coming before it stops a change — and the gate already enforces all
   * of them. A single field could only carry the last one written, which made
   * the report unable to say what the gate was actually enforcing.
   *
   * Stays an empty array where nothing limits the metric, never absent.
   */
  limits: ReportLimit[];
  /**
   * The metric's name across runs: its target's name, then its path.
   *
   * Stable by construction — both halves are written in the configuration —
   * which is what lets a consumer join this run's report against the last
   * one's instead of reading every metric as removed and re-added.
   */
  name: string;
  /** The metric's path within its target, with no target name on the front. */
  path: string;
  /**
   * `bytes` where the value counts bytes, `null` for a plain count.
   *
   * Bytes are raw and decimal: a renderer showing kilobytes divides by 1000.
   */
  unit: MetricUnit;
  value: number;
}

/** One target's metrics, and whether its globs claimed anything at all. */
export interface ReportTarget {
  /**
   * True when the target's globs matched no files.
   *
   * Said outright rather than left to be read off a missing limit or a zero,
   * because a target that matched nothing passes every limit written against
   * it while measuring nothing at all.
   */
  empty: boolean;
  /** How many files the target's globs claimed. */
  files: number;
  metrics: ReportMetric[];
  name: string;
}
