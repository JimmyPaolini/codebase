// 🏷️ Types

import type {
  CallGraphResult,
  ResolvedCallidescopeJsonOutputConfiguration,
} from "@callidescope/configuration";

/** Arguments for rendering the JSON report. */
export interface BuildReportArguments {
  readonly destination: ResolvedCallidescopeJsonOutputConfiguration;
  readonly result: CallGraphResult;
}

/** Arguments for syncing the configured JSON destination. */
export interface SyncJsonArguments extends BuildReportArguments {
  readonly check: boolean;
}
