// 🏷️ Types

import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/** Options the CLI accepts. */
export interface CallidescopeCommandOptions {
  readonly check?: boolean | undefined;
  readonly config?: string | undefined;
  readonly directory?: string | undefined;
  readonly json?: string | undefined;
  readonly markdown?: string | undefined;
  readonly projects?: string[] | undefined;
}

/** Arguments for writing every configured destination. */
export interface SyncDestinationsArguments {
  readonly check: boolean;
  readonly configuration: ResolvedCallidescopeConfiguration;
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
  readonly result: CallGraphResult;
}
