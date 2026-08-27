// 🏷️ Types

import type { EvaluatedLimit, TargetMetricIndex } from "../limits/limits.types";
import type { ReportFailure } from "../report/report.types";
import type { DocumentationMeasurement } from "./documentation-measurement.types";
import type {
  CodeStatisticsResult,
  ResolvedCodometerConfiguration,
  ResolvedCodometerTarget,
} from "@codometer/configuration";
import type { DiscoveryResult } from "@codometer/discovery";
import type { SizeResult } from "@codometer/size";

/**
 * Arguments accepted when running language analysis over a target's files.
 */
export interface AnalyzeLanguageArguments {
  configuration: ResolvedCodometerConfiguration;
  discoveredFiles: DiscoveryResult;
  workingDirectory: string;
}

/**
 * Arguments accepted by the measurement pipeline.
 */
export interface MeasureArguments {
  configuration: ResolvedCodometerConfiguration;
  /**
   * Files codometer writes itself, relative to the measured directory.
   *
   * Never measured, whether or not this particular run writes them: a run that
   * measured a different tree depending on its flags could not tell a stale
   * report from a report written by a differently-flagged run.
   */
  outputPaths: readonly string[];
  workingDirectory: string;
}

/**
 * Options accepted by the codometer command.
 *
 * `--write` and `--check` are independent: neither implies the other, and no
 * combination of them is inferred. A flag carrying an optional value arrives
 * as `true` when it was passed without one, which is how "to the console" is
 * told apart from "not asked for".
 */
export interface MeasureCommandOptions {
  /** The comma-separated set of things to fail on, as it was written. */
  check?: string | true | undefined;
  config?: string | undefined;
  directory?: string | undefined;
  /** Where the report goes; `true` for the console. */
  json?: string | true | undefined;
  /** Where the rendered badges go as a whole document; `true` for the console. */
  markdown?: string | true | undefined;
  /** The file to splice the badge block into. Never defaulted. */
  readme?: string | undefined;
  write?: boolean | undefined;
}

/**
 * Everything one run measured, target by target.
 *
 * `statistics` is the codebase target's language metrics, which is the report
 * every consumer renders today. It is the same object the target carries, held
 * out separately so nothing downstream has to know which target it came from.
 */
export interface MeasurementResult {
  /** Every documented declaration across every target, flattened, in measurement order. */
  documentation: DocumentationMeasurement[];
  /**
   * Whatever the run could not do, collected rather than thrown.
   *
   * A target that will not measure and a limit that binds to nothing are both
   * recorded here and stepped over, so one run names every one of them instead
   * of stopping at the first and hiding the rest behind it.
   */
  failures: ReportFailure[];
  /** Every metric each measured target counted, addressable by dotted path. */
  indexes: Map<string, TargetMetricIndex>;
  /**
   * What every declared limit found, in the order they were declared.
   *
   * Empty when nothing declared one, which is the ordinary case: a metric with
   * no limit is measured and reported like every other, and gated by nothing.
   */
  limits: EvaluatedLimit[];
  statistics: CodeStatisticsResult;
  targets: TargetMeasurement[];
}

/**
 * Arguments accepted when measuring one declared target.
 */
export interface MeasureTargetArguments {
  configuration: ResolvedCodometerConfiguration;
  outputPaths: readonly string[];
  target: ResolvedCodometerTarget;
  workingDirectory: string;
}

/**
 * What every analysis declared for one target reported over its files.
 *
 * An analysis a target did not ask for reports `undefined` rather than a zero,
 * so a target nobody measured the size of is never mistaken for an empty one.
 */
export interface TargetMeasurement {
  documentation: DocumentationMeasurement[];
  /** How many files the target's globs claimed. */
  files: number;
  language: CodeStatisticsResult | undefined;
  name: string;
  size: SizeResult | undefined;
}
