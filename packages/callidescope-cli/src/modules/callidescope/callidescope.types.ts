// 🏷️ Types

import type {
  CallableId,
  CallGraphResult,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { CallGraph, DiscoveredCallable } from "@callidescope/graph";

/** Options `depth` and `breadth` accept, scoping a lookup to one workspace. */
export interface AddressCommandOptions {
  readonly config?: string | undefined;
  readonly directory?: string | undefined;
  readonly format?: CallidescopeOutputFormat | undefined;
  readonly projects?: string[] | undefined;
}

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
  readonly directory?: string | undefined;
  readonly format?: CallidescopeOutputFormat | undefined;
  readonly json?: string | undefined;
  readonly markdown?: string | undefined;
  readonly projects?: string[] | undefined;
  readonly write?: boolean | undefined;
}

/** The collected callables and their graph, without any analysis run over them. */
export interface LocateOutcome {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly graph: CallGraph;
  /** Workspace-relative root of each project traced, keyed by name. */
  readonly projectRoots: ReadonlyMap<string, string>;
}

/** Arguments for writing every configured destination. */
export interface SyncDestinationsArguments {
  readonly check: boolean;
  readonly configuration: ResolvedCallidescopeConfiguration;
  readonly projectRoots: ReadonlyMap<string, string>;
  readonly result: CallGraphResult;
}

/** Arguments for one full trace of a workspace. */
export interface TraceArguments {
  readonly configuration: ResolvedCallidescopeConfiguration;
  readonly projectNames: readonly string[];
  readonly workspaceRoot: string;
}

/** What one trace produced, alongside the projects it covered. */
export interface TraceOutcome {
  readonly projectNames: readonly string[];
  /** Workspace-relative root of each project traced, keyed by name. */
  readonly projectRoots: ReadonlyMap<string, string>;
  readonly result: CallGraphResult;
}
