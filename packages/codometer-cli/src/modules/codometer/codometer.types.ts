// 🏷️ Types

import type { FileDiscoveryResult } from "../file-discovery/file-discovery.types";
import type { EvaluatedLimit } from "../limits/limits.types";
import type { SizeResult } from "../size-analysis/size-analysis.types";
import type {
  CodeStatisticsResult,
  ResolvedCodometerConfiguration,
  ResolvedCodometerJsonOutputConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
  ResolvedCodometerTarget,
} from "@codometer/configuration";

/**
 * Arguments accepted when running language analysis over a target's files.
 */
export interface AnalyzeLanguageArguments {
  configuration: ResolvedCodometerConfiguration;
  discoveredFiles: FileDiscoveryResult;
  workingDirectory: string;
}

/**
 * Options accepted by the codometer command.
 *
 * Every path option overrides the matching destination in the configuration
 * file, which is what lets a task runner point one invocation somewhere else
 * without a second configuration file.
 */
export interface CodometerCommandOptions {
  check?: boolean;
  config?: string;
  directory?: string;
  json?: string;
  markdown?: string;
}

/**
 * Arguments accepted by the measurement pipeline.
 */
export interface MeasureArguments {
  configuration: ResolvedCodometerConfiguration;
  workingDirectory: string;
}

/**
 * Everything one run measured, target by target.
 *
 * `statistics` is the codebase target's language metrics, which is the report
 * every consumer renders today. It is the same object the target carries, held
 * out separately so nothing downstream has to know which target it came from.
 */
export interface MeasurementResult {
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
  target: ResolvedCodometerTarget;
  workingDirectory: string;
}

/**
 * Arguments accepted when resolving where an output file is written.
 */
export interface ResolveDestinationArguments {
  configuration: ResolvedCodometerConfiguration;
  options: CodometerCommandOptions;
  workingDirectory: string;
}

/**
 * Arguments accepted when syncing every resolved output destination.
 */
export interface SyncDestinationsArguments {
  check: boolean;
  json: ResolvedCodometerJsonOutputConfiguration | undefined;
  markdown: ResolvedCodometerMarkdownOutputConfiguration | undefined;
  statistics: CodeStatisticsResult;
}

/**
 * What every analysis declared for one target reported over its files.
 *
 * An analysis a target did not ask for reports `undefined` rather than a zero,
 * so a target nobody measured the size of is never mistaken for an empty one.
 */
export interface TargetMeasurement {
  /** How many files the target's globs claimed. */
  files: number;
  language: CodeStatisticsResult | undefined;
  name: string;
  size: SizeResult | undefined;
}
