// 🏷️ Types

import type {
  CallableId,
  MisplacedCallableFinding,
  ModuleSpreadFinding,
  TypeDepthSummary,
} from "@callidescope/configuration";
import type {
  BreadthMeasurement,
  CallGraph,
  CondensedGraph,
  DepthMeasurement,
  DiscoveredCallable,
  EntryPointCollection,
} from "@callidescope/graph";

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
