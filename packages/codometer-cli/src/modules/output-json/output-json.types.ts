// 🏷️ Types

import type {
  CodeStatisticsResult,
  ResolvedCodometerJsonOutputConfiguration,
} from "@codometer/configuration";

/** Arguments accepted when rendering the JSON report. */
export interface BuildReportArguments {
  destination: ResolvedCodometerJsonOutputConfiguration;
  statistics: CodeStatisticsResult;
}

/** Arguments accepted when syncing a JSON file with the statistics. */
export interface SyncJsonArguments {
  check: boolean;
  destination: ResolvedCodometerJsonOutputConfiguration;
  statistics: CodeStatisticsResult;
}
