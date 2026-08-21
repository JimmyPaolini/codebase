// 🏷️ Types

import type {
  CallGraphResult,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

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
