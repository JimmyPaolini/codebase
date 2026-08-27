// 🏷️ Types

import type { LocateOutcome } from "../callidescope/callidescope.types";
import type {
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/** Options `depth` and `breadth` accept, scoping a lookup to one workspace. */
export interface AddressCommandOptions {
  /**
   * Callable addresses to report on, each `<file>#<qualified-name>`.
   *
   * Prompted for when empty. Required in the sense that a run cannot proceed
   * without one — but asked for rather than refused, so the flag is only
   * mandatory on a command line nobody is watching.
   */
  readonly addresses?: string[] | undefined;
  readonly config?: string | undefined;
  /** Project directories to trace. Every project in the workspace when omitted. */
  readonly directories?: string[] | undefined;
  readonly format?: CallidescopeOutputFormat | undefined;
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
