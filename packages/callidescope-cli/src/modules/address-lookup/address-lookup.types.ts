// 🏷️ Types

import type { LocateOutcome } from "../callidescope/callidescope.types";
import type {
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/**
 * Options `depth` and `breadth` accept, scoping a lookup to one workspace.
 *
 * Every override that shapes the graph is here, and no other kind is. A lookup
 * gates nothing and writes nothing, so a limit or a destination has nothing to
 * act on — overriding one would change a number this command never reads.
 */
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
  /** Overrides `entryPoints.addresses` for this lookup. */
  readonly entryPointAddresses?: string[] | undefined;
  /** Overrides `entryPoints.decorators` for this lookup. */
  readonly entryPointDecorators?: string[] | undefined;
  /** Overrides `exclude` for this lookup. */
  readonly exclude?: string[] | undefined;
  /** Overrides `excludeCallees` for this lookup. */
  readonly excludeCallees?: string[] | undefined;
  /** `--format`, exactly as it was typed, for the resolver to judge. */
  readonly format?: string | undefined;
  /** Overrides `entryPoints.includeExportedFunctions`, as it was typed. */
  readonly includeExportedFunctions?: string | true | undefined;
  /** Overrides `entryPoints.includeOrphans`, as it was typed. */
  readonly includeOrphans?: string | true | undefined;
  /** Overrides `entryPoints.includeTests`, as it was typed. */
  readonly includeTests?: string | true | undefined;
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
  /** What the lookup prints, resolved from the command line and refused if unknown. */
  readonly format: CallidescopeOutputFormat;
  readonly located: LocateOutcome;
  readonly workspaceRoot: string;
}

/** Arguments for matching an address against an already-traced workspace. */
export interface ResolveAddressArguments {
  readonly address: string;
  readonly workspace: LocatedWorkspace;
}
