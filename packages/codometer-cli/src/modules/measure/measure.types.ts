// 🏷️ Types

import type { EvaluatedLimit, TargetMetricIndex } from "../limits/limits.types";
import type {
  CodeStatisticsResult,
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  ResolvedCodometerInput,
} from "@codometer/configuration";
import type { DiscoveryResult } from "@codometer/discovery";
import type {
  DocumentationCommentCounter,
  LanguageCommentCounter,
  TypescriptSymbolCounter,
} from "@codometer/languages";
import type { SizeResult } from "@codometer/size";

/**
 * Arguments accepted when running every analyzer over one set of files.
 */
export interface AnalyzeFilesArguments {
  commentCounters: LanguageCommentCounter[];
  configuration: ResolvedCodometerConfiguration;
  discoveredFiles: DiscoveryResult;
  documentationCounters: DocumentationCommentCounter[];
  statistics: ResolvedCodometerCustomStatistic[];
  symbolCounters: TypescriptSymbolCounter[];
  workingDirectory: string;
}

/**
 * What every analysis declared for one input reported over its files.
 *
 * An analysis an input did not ask for reports `undefined` rather than a zero,
 * so an input nobody measured the size of is never mistaken for an empty one.
 */
export interface InputMeasurement {
  /** How many files the input's globs claimed. */
  files: number;
  language: CodeStatisticsResult | undefined;
  name: string;
  size: SizeResult | undefined;
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
 * `--output-json` and `--output-markdown` are each independent: passing one
 * never implicitly writes the other, and neither implies `--check reports`.
 * There is no `--write` — passing an `--output-*` flag at all is what makes
 * this run produce that destination.
 */
export interface MeasureCommandOptions {
  /** The comma-separated set of things to fail on, as it was written. */
  check?: string | true | undefined;
  config?: string | undefined;
  /** What to print to standard output, as it was written. */
  format?: string | undefined;
  /**
   * The glob array that replaces every configured input for this run, as
   * written. `undefined` when the flag was never passed at all.
   */
  inputs?: string[] | undefined;
  /**
   * The report's destination, as it was written.
   *
   * `true` for a bare flag naming no path, a string for an explicit one, and
   * `undefined` when the flag was never passed.
   */
  outputJson?: string | true | undefined;
  /**
   * The markdown destination, as it was written.
   *
   * `true` for a bare flag naming no path, a string for an explicit one, and
   * `undefined` when the flag was never passed.
   */
  outputMarkdown?: string | true | undefined;
}

/**
 * Arguments accepted when measuring one declared input.
 */
export interface MeasureInputArguments {
  commentCounters: LanguageCommentCounter[];
  configuration: ResolvedCodometerConfiguration;
  documentationCounters: DocumentationCommentCounter[];
  input: ResolvedCodometerInput;
  outputPaths: readonly string[];
  statistics: ResolvedCodometerCustomStatistic[];
  symbolCounters: TypescriptSymbolCounter[];
  workingDirectory: string;
}

/**
 * Everything one run measured, input by input.
 *
 * `statistics` is the `codebase` input's own language metrics, which is the
 * report every consumer renders today. It is the same object that input
 * carries, held out separately so nothing downstream has to know which input
 * it came from.
 */
export interface MeasurementResult {
  /**
   * Whatever the run could not do, collected rather than thrown.
   *
   * An input that will not measure and a limit that binds to nothing are both
   * recorded here and stepped over, so one run names every one of them instead
   * of stopping at the first and hiding the rest behind it.
   */
  failures: ReportFailure[];
  /** Every metric each measured input counted, addressable by dotted path. */
  indexes: Map<string, TargetMetricIndex>;
  /** Every input measured, in the order `inputs` declared them. */
  inputs: InputMeasurement[];
  /**
   * What every declared limit found, in the order they were declared.
   *
   * Empty when nothing declared one, which is the ordinary case: a metric with
   * no limit is measured and reported like every other, and gated by nothing.
   */
  limits: EvaluatedLimit[];
  statistics: CodeStatisticsResult;
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
  /** An input's name for an input failure, a limit's written path for a limit. */
  subject: string;
}

/**
 * Which part of a run a failure belongs to.
 *
 * `input` is a set of files that could not be measured; `limit` is a declared
 * limit that could not be held against anything. Neither is a breach, and a
 * consumer that treats them as one reports a passing gate for a metric nobody
 * ever measured.
 */
export type ReportFailureKind = "input" | "limit";
