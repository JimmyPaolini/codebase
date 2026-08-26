// 🏷️ Types

import type { MeasurementResult } from "../codometer/codometer.types";
import type { CodometerReport } from "../report/report.types";
import type { RunDestinations, RunMode } from "../run-plan/run-plan.types";
import type { MeasurementScope } from "@codometer/output";

/** Arguments accepted when producing every one of a run's outputs. */
export interface DeliverArguments {
  destinations: RunDestinations;
  measurement: MeasurementResult;
  mode: RunMode;
  report: CodometerReport;
  scope: MeasurementScope;
}
