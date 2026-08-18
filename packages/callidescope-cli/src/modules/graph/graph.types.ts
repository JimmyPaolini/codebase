// 🏷️ Types

import type {
  CallableId,
  CallEdge,
  ModuleId,
  UnresolvedCall,
} from "@callidescope/configuration";

/** The assembled call graph, indexed both ways. */
export interface CallGraph {
  readonly calleeIdsByCaller: ReadonlyMap<CallableId, readonly CallableId[]>;
  readonly callerIdsByCallee: ReadonlyMap<CallableId, readonly CallableId[]>;
  readonly edges: readonly CallEdge[];
  /** Callables holding at least one call that could not be followed. */
  readonly unresolvedCallerIds: ReadonlySet<CallableId>;
  readonly unresolvedCalls: readonly UnresolvedCall[];
}

/** Memoized longest-path result for one component. */
export interface ComponentDepth {
  /** The successor lying on the deepest path, for O(depth) reconstruction. */
  readonly deepestSuccessor: number | undefined;
  readonly depth: number;
  /** Modules this component and everything below it touch. */
  readonly moduleIds: ReadonlySet<ModuleId>;
  /** True when the deepest path runs through an unfollowable call. */
  readonly reachesUnresolved: boolean;
}

/**
 * The graph with each cycle collapsed into one node.
 *
 * Longest path is only well defined on an acyclic graph, so recursion is
 * condensed away before depth is computed rather than special-cased during it.
 */
export interface CondensedGraph {
  readonly componentIdByCallable: ReadonlyMap<CallableId, number>;
  readonly memberIdsByComponent: readonly (readonly CallableId[])[];
  readonly successorsByComponent: readonly ReadonlySet<number>[];
}

/** Depth and spread for every component in the condensation. */
export interface DepthMeasurement {
  readonly byComponent: readonly ComponentDepth[];
}

/** Arguments for measuring depth and module spread across the graph. */
export interface MeasureDepthArguments {
  readonly condensed: CondensedGraph;
  readonly graph: CallGraph;
  readonly moduleIdByCallable: ReadonlyMap<CallableId, ModuleId>;
}
