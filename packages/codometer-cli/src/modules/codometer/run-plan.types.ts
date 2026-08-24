// 🏷️ Types

import type { CodometerReport } from "../report/report.types";
import type {
  CodometerCommandOptions,
  MeasurementResult,
} from "./codometer.types";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";
import type { MeasurementScope } from "@codometer/output";

/** Arguments accepted when producing every one of a run's outputs. */
export interface DeliverArguments {
  destinations: RunDestinations;
  measurement: MeasurementResult;
  mode: RunMode;
  report: CodometerReport;
  scope: MeasurementScope;
}

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

/** Where the rendered badges go as a document of their own. */
export interface MarkdownDocumentDestination {
  description: string | undefined;
  path: string | undefined;
}

/**
 * What the command line asked the run to do, and what it could not make sense of.
 *
 * Every complaint is collected before any of them is reported, so a command
 * line with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface ModeSelection {
  errors: string[];
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
  options: CodometerCommandOptions;
  workingDirectory: string;
}

/**
 * Every destination one run produces.
 *
 * All three are independent sinks. `markdown` is a whole document of rendered
 * badges, `readme` splices that block between two markers in a file somebody
 * named, and `json` is the report.
 */
export interface RunDestinations {
  json: JsonDestination | undefined;
  markdown: MarkdownDocumentDestination | undefined;
  readme: ResolvedCodometerMarkdownOutputConfiguration | undefined;
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
