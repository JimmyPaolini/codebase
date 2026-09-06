// 🏷️ Types

import type {
  CallableId,
  CallGraphResult,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { CallGraph, DiscoveredCallable } from "@callidescope/graph";

/** Options the CLI accepts. */
export interface CallidescopeCommandOptions {
  /**
   * The written `--check` set, or `true` for the flag passed without one.
   *
   * Kept as written rather than read into booleans here, so the one place that
   * knows which names exist is the only place that decides what they mean.
   */
  readonly check?: string | true | undefined;
  readonly config?: string | undefined;
  /** Project directories to trace. Every project in the workspace when omitted. */
  readonly directories?: string[] | undefined;
  readonly format?: CallidescopeOutputFormat | undefined;
  readonly json?: string | undefined;
  readonly markdown?: string | undefined;
  readonly write?: boolean | undefined;
}

/** The collected callables and their graph, without any analysis run over them. */
export interface LocateOutcome {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly graph: CallGraph;
  /** Workspace-relative root of each project the run was scoped to, keyed by name. */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
}

/** Arguments for writing every configured destination. */
export interface SyncDestinationsArguments {
  readonly check: boolean;
  readonly configuration: ResolvedCallidescopeConfiguration;
  readonly result: CallGraphResult;
  /**
   * Workspace-relative root of each project the run was scoped to, keyed by
   * name. Only these projects have a README section published, so a scoped run
   * never writes into a dependency it merely measured.
   */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
}

/** Arguments for one full trace of a workspace. */
export interface TraceArguments {
  readonly configuration: ResolvedCallidescopeConfiguration;
  /** Project directories to trace. Every project in the workspace when empty. */
  readonly directories: readonly string[];
  readonly workspaceRoot: string;
}

/** What one trace produced, alongside the projects it covered. */
export interface TraceOutcome {
  /** Every project the run measured, its dependency closure included. */
  readonly projectNames: readonly string[];
  readonly result: CallGraphResult;
  /**
   * Workspace-relative root of each project the run was scoped to, keyed by
   * name — the starting projects, not the closure they reached.
   */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
}
