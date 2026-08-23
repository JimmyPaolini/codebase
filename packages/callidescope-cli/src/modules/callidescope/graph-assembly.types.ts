// 🏷️ Types

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  BreadthMeasurement,
  CallGraph,
  CondensedGraph,
  DepthMeasurement,
} from "../graph/graph.types";
import type { CallableId } from "@callidescope/configuration";

/** The call graph, its cycle condensation, and its depth and breadth measurements. */
export interface AssembledGraph {
  readonly breadthMeasurement: BreadthMeasurement;
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
