// 🏷️ Types

import type { LocateOutcome } from "../callidescope/callidescope.types";
import type {
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/** Options `depth` and `breadth` accept, scoping a lookup to one workspace. */
export interface AddressCommandOptions {
  readonly config?: string | undefined;
  /** Project directories to trace. Every project in the workspace when omitted. */
  readonly directories?: string[] | undefined;
  readonly format?: CallidescopeOutputFormat | undefined;
  /** `false` when `--no-interactive` opted out of prompting for a missing value. */
  readonly interactive?: boolean | undefined;
}

/**
 * A traced workspace, before any address has been matched against it.
 *
 * Held apart from the match so one trace can serve both the list a prompt
 * completes against and the lookup that follows it. Tracing twice to offer a
 * choice and then act on it would double the slowest thing either command
 * does.
 */
export interface LocatedWorkspace {
  readonly configuration: ResolvedCallidescopeConfiguration;
  readonly located: LocateOutcome;
  readonly workspaceRoot: string;
}

/** Arguments for matching an address against an already-traced workspace. */
export interface ResolveAddressArguments {
  readonly address: string;
  readonly workspace: LocatedWorkspace;
}
