// 🏷️ Types

import type { DiscoveredCallable } from "../callables/callables.types";
import type { EntryPointCollection } from "../entry-points/entry-points.types";
import type {
  BreadthMeasurement,
  CallGraph,
  CondensedGraph,
  DepthMeasurement,
} from "../graph/graph.types";
import type {
  CallableId,
  MisplacedCallableFinding,
  ModuleSpreadFinding,
  TypeDepthSummary,
} from "@callidescope/configuration";

/** Arguments for scoping a run's findings to each project that produced them. */
export interface BuildProjectReportsArguments {
  readonly breadthMeasurement: BreadthMeasurement;
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly condensed: CondensedGraph;
  readonly entryPoints: EntryPointCollection;
  readonly fileCountByProject: ReadonlyMap<string, number>;
  readonly graph: CallGraph;
  readonly measurement: DepthMeasurement;
  readonly misplacedCallables: readonly MisplacedCallableFinding[];
  readonly moduleSpreads: readonly ModuleSpreadFinding[];
  readonly projectNames: readonly string[];
  readonly typeDepths: readonly TypeDepthSummary[];
}
