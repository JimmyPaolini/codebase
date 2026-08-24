// 🏷️ Types

import type { ResolvedCodometerCustomStatistic } from "@codometer/configuration";

/** Input to the custom statistics step. */
export interface CustomStatisticsInput {
  /** Every file of the target being counted over. */
  files: string[];
  statistics: ResolvedCodometerCustomStatistic[];
  /** What the TypeScript analyzer tallied, keyed by counter label. */
  symbolCounts: Record<string, number>;
}
