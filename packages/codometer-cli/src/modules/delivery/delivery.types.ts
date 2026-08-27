// 🏷️ Types

import type { MeasurementResult } from "../measure/measure.types";
import type { CodometerReport } from "../report/report.types";
import type {
  MeasureFormat,
  RunDestinations,
  RunMode,
} from "../run-plan/run-plan.types";
import type { MeasurementScope } from "@codometer/output";

/** Arguments accepted when producing every one of a run's outputs. */
export interface DeliverArguments {
  destinations: RunDestinations;
  /** What goes to standard output, or nothing when the run prints nothing. */
  format: MeasureFormat | undefined;
  measurement: MeasurementResult;
  mode: RunMode;
  report: CodometerReport;
  scope: MeasurementScope;
}
