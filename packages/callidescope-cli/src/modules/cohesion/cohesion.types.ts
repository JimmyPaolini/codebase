// 🏷️ Types

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  CallGraph,
  CondensedGraph,
  DepthMeasurement,
} from "../graph/graph.types";
import type {
  CallableId,
  ModuleId,
  ResolvedCallidescopeLimits,
} from "@callidescope/configuration";

/** Arguments for the module-spread and misplaced-callable findings. */
export interface AnalyzeCohesionArguments {
  readonly allowSpreadFor: readonly string[];
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly condensed: CondensedGraph;
  readonly graph: CallGraph;
  readonly limits: ResolvedCallidescopeLimits;
  readonly measurement: DepthMeasurement;
}

/** How one callable's callers are distributed across modules. */
export interface CallerDistribution {
  readonly dominantCount: number;
  readonly dominantModuleId: ModuleId | undefined;
  readonly totalCount: number;
}
