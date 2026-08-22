// 🏷️ Types

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  CallGraph,
  CondensedGraph,
  DepthMeasurement,
} from "../graph/graph.types";
import type { CallableId } from "@callidescope/configuration";

/** The call graph, its cycle condensation, and its depth measurement. */
export interface AssembledGraph {
  readonly condensed: CondensedGraph;
  readonly graph: CallGraph;
  readonly measurement: DepthMeasurement;
}

/** Arguments for assembling the call graph and everything derived from it. */
export interface AssembleGraphArguments {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly includeConstructorEdges: boolean;
  readonly workspaceRoot: string;
}
