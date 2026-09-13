// 🏷️ Types

import type {
  MeasureCommandOptions,
  MeasurementResult,
} from "../measure/measure.types";
import type { FORMAT_NAMES } from "./run-plan.constants";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerCustomStatistic,
  WriteMarkdownOutput,
} from "@codometer/configuration";

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
 * What the command line asked the run to do, and what it could not make sense
 * of.
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
  options: MeasureCommandOptions;
  workingDirectory: string;
}

/** Every file one run writes, and the destinations found along the way. */
export interface ResolveDestinationsResult {
  destinations: RunDestinations;
  errors: string[];
}

/** A JSON output destination, resolved for this run. */
export interface ResolvedJsonDestination {
  custom: ResolvedCodometerCustomStatistic[];
  indentation: number;
  path: string;
}

/** A markdown output destination, resolved for this run. */
export interface ResolvedMarkdownDestination {
  custom: ResolvedCodometerCustomStatistic[];
  description: string | undefined;
  endMarker: string;
  path: string | undefined;
  startMarker: string;
  // Carried so a destination is a `ResolvedCodometerMarkdownOutput` in its own
  // right, which is what `@codometer/output` renders. A resolved destination is
  // always the markdown one — the field says which entry shape it came from,
  // not which of several it might be.
  type: "markdown";
  write: undefined | WriteMarkdownOutput;
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
  json: ResolvedJsonDestination | undefined;
  markdown: ResolvedMarkdownDestination | undefined;
}

/**
 * What the run does with what it measures.
 *
 * Checking staleness gates on `checksReports` alone and a breach on
 * `checksLimits` alone. Writing is answered per output: `writesJson` and
 * `writesMarkdown` are each true only when that output's own `--output-*`
 * flag was passed, so no flag ever quietly writes a destination the command
 * line never named.
 */
export interface RunMode {
  checksLimits: boolean;
  checksReports: boolean;
  writesJson: boolean;
  writesMarkdown: boolean;
}

/**
 * Everything a run needs once its command line has been made sense of: the
 * resolved configuration, what to print, where each output goes, and what
 * the run does with what it measures.
 */
export interface RunPlan {
  configuration: ResolvedCodometerConfiguration;
  destinations: RunDestinations;
  format: MeasureFormat | undefined;
  mode: RunMode;
}
