// 🏷️ Types

import type { DiscoveredCallable } from "../callables/callables.types";
import type { CallGraph } from "../graph/graph.types";
import type { CallableId, EntryPoint } from "@callidescope/configuration";

/** The roots a run will measure depth from. */
export interface EntryPointCollection {
  readonly entryPoints: readonly EntryPoint[];
}

/** Arguments for deciding which callables root a call stack. */
export interface ResolveEntryPointsArguments {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly decorators: ReadonlySet<string>;
  readonly graph: CallGraph;
  readonly includeExportedFunctions: boolean;
  readonly includeOrphans: boolean;
}
