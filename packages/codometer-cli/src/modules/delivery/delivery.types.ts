// 🏷️ Types

import type { MeasurementResult } from "../measure/measure.types";
import type { CodometerReport } from "../report/report.types";
import type {
  MeasureFormat,
  ResolvedMarkdownDestination,
  RunDestinations,
  RunMode,
} from "../run-plan/run-plan.types";
import type { MeasurementScope } from "@codometer/output";

/** Arguments accepted when producing every one of a run's outputs. */
export interface DeliverArguments {
  /** Where the printed badge block's own configured counters come from,
   * resolved independently of `destinations.markdown`. */
  consoleMarkdown: ResolvedMarkdownDestination | undefined;
  destinations: RunDestinations;
  /** What goes to standard output, or nothing when the run prints nothing. */
  format: MeasureFormat | undefined;
  measurement: MeasurementResult;
  mode: RunMode;
  report: CodometerReport;
  scope: MeasurementScope;
}
