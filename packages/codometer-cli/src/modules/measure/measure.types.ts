// 🏷️ Types

import type { EvaluatedLimit, TargetMetricIndex } from "../limits/limits.types";
import type {
  CodeStatisticsResult,
  ResolvedCodometerConfiguration,
  ResolvedCodometerTarget,
} from "@codometer/configuration";
import type { DiscoveryResult } from "@codometer/discovery";
import type { TypescriptDocumentationMeasurement } from "@codometer/languages";
import type { SizeResult } from "@codometer/size";

/**
 * Arguments accepted when running every analyzer over one set of files.
 */
export interface AnalyzeFilesArguments {
  configuration: ResolvedCodometerConfiguration;
  discoveredFiles: DiscoveryResult;
  workingDirectory: string;
}

/** One measured JSDoc comment, with the target it was found in. */
export interface DocumentationMeasurement extends TypescriptDocumentationMeasurement {
  target: string;
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
 * Options accepted by the measure command.
 *
 * `--write` and `--check` are independent: neither implies the other, and no
 * combination of them is inferred.
 *
 * Standard output and files are asked for separately: `--format` says what to
 * print, and each `--output-*` says which file to write. A path therefore
 * always means a file and never the console, which is what the optional-value
 * `--json`/`--markdown` flags used to overload — a flag whose meaning changed
 * depending on whether it carried a value.
 */
export interface MeasureCommandOptions {
  /** The comma-separated set of things to fail on, as it was written. */
  check?: string | true | undefined;
  config?: string | undefined;
  directory?: string | undefined;
  /** What to print to standard output, as it was written. */
  format?: string | undefined;
  /** The file the report is written to. Never defaulted. */
  outputJson?: string | undefined;
  /** The markdown file the badge block goes into. Never defaulted. */
  outputMarkdown?: string | undefined;
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
 * Something the run could not do, and what it was trying to do it to.
 *
 * Declared beside the measurement that produces it rather than beside the
 * report that renders it, so the dependency between the two runs one way. The
 * name says where it surfaces: `CodometerReport.failures` is what a consumer
 * reads it from.
 */
export interface ReportFailure {
  /** Which part of the run it failed in. */
  kind: ReportFailureKind;
  reason: string;
  /** A target's name for a target failure, a limit's written path for a limit. */
  subject: string;
}

/**
 * Which part of a run a failure belongs to.
 *
 * `target` is a set of files that could not be measured; `limit` is a declared
 * limit that could not be held against anything. Neither is a breach, and a
 * consumer that treats them as one reports a passing gate for a metric nobody
 * ever measured.
 */
export type ReportFailureKind = "limit" | "target";

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
