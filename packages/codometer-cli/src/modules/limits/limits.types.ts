// 🏷️ Types

import type { SizeResult } from "../size-analysis/size-analysis.types";
import type {
  CodeStatisticsResult,
  CodometerSeverity,
  ResolvedCodometerConfiguration,
} from "@codometer/configuration";

/** Arguments accepted when binding one metric path within one target. */
export interface BindMetricArguments {
  index: TargetMetricIndex;
  /** The path with the target's name already taken off it. */
  metricPath: string;
  /** The path as the limit was written, for an error that has to quote it. */
  path: string;
  target: string;
}

/**
 * What one limit found once it was pointed at its metric.
 *
 * A breach is one of these carrying `breached`, and it reports everything a
 * breach has to: which metric, held to what, and what the metric actually
 * measured. A limit that held is reported the same way, so a report can show
 * the headroom rather than only the failures.
 */
export interface EvaluatedLimit {
  /** Whether the measured value came out above the limit. */
  breached: boolean;
  /** Stays `undefined` when none was written; a report falls back to the path. */
  label: string | undefined;
  limit: number;
  measured: number;
  /** The metric's path within its target, with no target name on the front. */
  metric: string;
  severity: CodometerSeverity;
  target: string;
}

/** Arguments accepted when evaluating every declared limit. */
export interface EvaluateLimitsArguments {
  configuration: ResolvedCodometerConfiguration;
  targets: readonly MeasuredTarget[];
}

/**
 * What one target measured, as the limits layer reads it.
 *
 * Declared here rather than imported from the measurement pipeline: gating a
 * number needs the number and its target's name, and nothing about how either
 * was produced.
 */
export interface MeasuredTarget {
  files: number;
  language: CodeStatisticsResult | undefined;
  name: string;
  size: SizeResult | undefined;
}

/** Where a limit's path landed, and what the metric there measured. */
export interface MetricBinding {
  /**
   * How many files the bound target held.
   *
   * Carried along because a limit on a target that matched nothing is an
   * error, and the count is the only way to tell that apart from a target
   * that genuinely measured zero.
   */
  files: number;
  measured: number;
  metric: string;
  target: string;
}

/** Arguments accepted when resolving one limit's path to a single metric. */
export interface ResolveMetricArguments {
  defaultTarget: string | undefined;
  indexes: ReadonlyMap<string, TargetMetricIndex>;
  /** The dotted path exactly as the limit was written. */
  path: string;
}

/** Every metric one target measured, addressable by dotted path. */
export interface TargetMetricIndex {
  /**
   * Paths more than one metric answers to, which no limit may address.
   *
   * Two configured counters sharing a label is the way this happens. Either
   * metric would be a defensible binding, which is exactly why neither is.
   */
  ambiguous: Set<string>;
  files: number;
  metrics: Map<string, number>;
}
