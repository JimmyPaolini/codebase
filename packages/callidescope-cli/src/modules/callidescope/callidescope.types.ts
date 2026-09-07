// 🏷️ Types

import type {
  CallableId,
  CallGraphResult,
  CallidescopeLimits,
  CallidescopeOutputFormat,
  ProjectLimitsLookup,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeEntryPoints,
} from "@callidescope/configuration";
import type {
  CallableCollection,
  CallGraph,
  DiscoveredCallable,
  UnresolvedEntryPointAddress,
} from "@callidescope/graph";

/** What analyzing one run's callables produced. */
export interface AnalyzeOutcome {
  /**
   * The depth and breadth limits each traced project is judged against.
   *
   * Held beside the result rather than inside it, the same as
   * `unresolvedAddresses`: whether `--check breadth` even has a limit to gate
   * on is a fact about the projects a run reached, not part of the report
   * every destination writes.
   */
  readonly projectLimits: ProjectLimitsLookup;
  readonly result: CallGraphResult;
  /**
   * Declared entry-point addresses that named no callable, or more than one.
   *
   * Held beside the result rather than inside it: the report shape is what
   * gets written to every destination, and an address that stopped resolving
   * is a fact about the configuration rather than about the code it traced.
   */
  readonly unresolvedAddresses: readonly UnresolvedEntryPointAddress[];
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
  /** Project directories to trace. Every project in the workspace when omitted. */
  readonly directories?: string[] | undefined;
  readonly format?: CallidescopeOutputFormat | undefined;
  readonly json?: string | undefined;
  readonly markdown?: string | undefined;
  readonly write?: boolean | undefined;
}

/** Everything one walk of the workspace produced, before any analysis. */
export interface DiscoveredWorkspace extends ProjectDeclarations {
  readonly collection: CallableCollection;
  /** Every project the walk reached, its dependency closure included. */
  readonly projectNames: string[];
  /**
   * Workspace-relative root of each project the run was scoped to, keyed by
   * name — the starting projects, not the closure they reached.
   */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
}

/** The collected callables and their graph, without any analysis run over them. */
export interface LocateOutcome {
  readonly callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
  readonly graph: CallGraph;
  /** Workspace-relative root of each project the run was scoped to, keyed by name. */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
}

/** What every traced project declared about itself in its own configuration. */
export interface ProjectDeclarations {
  /** Entry-point rules a project declared for itself, keyed by project name. */
  readonly entryPointsByProject: ReadonlyMap<
    string,
    ResolvedCallidescopeEntryPoints
  >;
  /**
   * Exclusion globs a project declared for itself, keyed by project name and
   * matched against paths relative to that project's own root.
   *
   * A project that declared none is absent rather than present with an empty
   * array, so an empty map is what says no project in the run excludes
   * anything.
   */
  readonly excludeByProject: ReadonlyMap<string, readonly string[]>;
  /** The depth and breadth limits each traced project is judged against. */
  readonly projectLimits: ProjectLimitsLookup;
}

/** Arguments for writing every configured destination. */
export interface SyncDestinationsArguments {
  readonly check: boolean;
  readonly configuration: ResolvedCallidescopeConfiguration;
  /** The depth and breadth limits each traced project is judged against. */
  readonly projectLimits: ProjectLimitsLookup;
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
  /**
   * The limits the workspace file itself wrote down, exactly as authored.
   *
   * Carried so an inherited limit names the workspace file only when that file
   * really wrote the number: resolution defaults `maximumDepth` for every run,
   * and a path stamped from the resolved object alone would name a file for a
   * number it never mentions.
   */
  readonly authoredLimits?: CallidescopeLimits | undefined;
  readonly configuration: ResolvedCallidescopeConfiguration;
  /**
   * The file `configuration` was read from, when a file was found at all.
   *
   * Carried so the trace can skip it while resolving a configuration beside
   * every project it reaches: one file holds one role per run, and a package
   * whose task names its own file would otherwise have it read a second time
   * as that package's project configuration.
   */
  readonly configurationPath?: string | undefined;
  /** Project directories to trace. Every project in the workspace when empty. */
  readonly directories: readonly string[];
  readonly workspaceRoot: string;
}

/** What one trace produced, alongside the projects it covered. */
export interface TraceOutcome extends AnalyzeOutcome {
  /** Every project the run measured, its dependency closure included. */
  readonly projectNames: readonly string[];
  /**
   * Workspace-relative root of each project the run was scoped to, keyed by
   * name — the starting projects, not the closure they reached.
   */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
}
