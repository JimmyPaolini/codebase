// 🏷️ Types

import type {
  MeasureCommandOptions,
  MeasurementResult,
} from "../measure/measure.types";
import type { FORMAT_NAMES } from "./run-plan.constants";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";

/**
 * Where the report goes, and how it is laid out.
 *
 * A `path` of `undefined` is the console. Nothing is defaulted to a filename:
 * a destination nobody named is one nobody wants written.
 */
export interface JsonDestination {
  indentation: number;
  path: string | undefined;
}

/** Arguments accepted when listing the files a run writes. */
export interface ListOutputPathsArguments {
  destinations: RunDestinations;
  workingDirectory: string;
}

/**
 * What a run prints to standard output, when it prints anything.
 *
 * Derived from the list `--format` is validated against, so a format added
 * there is one this accepts rather than two lists to keep in step.
 */
export type MeasureFormat = (typeof FORMAT_NAMES)[number];

/**
 * What the command line asked the run to do, and what it could not make sense of.
 *
 * Every complaint is collected before any of them is reported, so a command
 * line with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface ModeSelection {
  errors: string[];
  /** What goes to standard output, or nothing when the run prints nothing. */
  format: MeasureFormat | undefined;
  mode: RunMode;
}

/** Arguments accepted when weighing what a run found. */
export interface ReportFindingsArguments {
  measurement: MeasurementResult;
  mode: RunMode;
  /** Destinations found not to hold the current output. Only ever non-empty
   * when the run was comparing, since nothing else reads a destination. */
  stalePaths: string[];
}

/** Arguments accepted when resolving where each output goes. */
export interface ResolveDestinationsArguments {
  configuration: ResolvedCodometerConfiguration;
  options: MeasureCommandOptions;
  workingDirectory: string;
}

/**
 * Every file one run writes.
 *
 * Two independent sinks: `json` is the report, and `markdown` is the badge
 * block spliced between two markers in a file somebody else wrote the rest
 * of. Neither says anything about standard output — that is `format`'s job
 * alone, so no destination can print a second document over the one a
 * pipeline was reading.
 */
export interface RunDestinations {
  json: JsonDestination | undefined;
  markdown: ResolvedCodometerMarkdownOutputConfiguration | undefined;
}

/**
 * What the run does with what it measures.
 *
 * The three are independent. Writing gates on `writes` alone, staleness on
 * `checksReports` alone, and a breach on `checksLimits` alone, so no flag ever
 * quietly turns another one on.
 */
export interface RunMode {
  checksLimits: boolean;
  checksReports: boolean;
  writes: boolean;
}
