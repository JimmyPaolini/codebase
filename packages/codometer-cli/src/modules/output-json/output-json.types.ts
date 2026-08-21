// 🏷️ Types

import type { CodometerReport } from "../report/report.types";

/** Arguments accepted when rendering the report as JSON. */
export interface RenderReportArguments {
  indentation: number;
  report: CodometerReport;
}

/** Arguments accepted when syncing a JSON file with the report. */
export interface SyncJsonArguments {
  check: boolean;
  indentation: number;
  path: string;
  report: CodometerReport;
}
