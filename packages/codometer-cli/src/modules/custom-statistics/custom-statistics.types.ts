// 🏷️ Types

import type { ResolvedCodometerCustomStatistic } from "@codometer/configuration";

/** Input to the custom statistics step. */
export interface CustomStatisticsInput {
  statistics: ResolvedCodometerCustomStatistic[];
  trackedFiles: string[];
}
