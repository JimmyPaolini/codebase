// 🏷️ Types

import type {
  CallGraphResult,
  ProjectLimitsLookup,
  ProjectReport,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeProjectReadmeConfiguration,
  ResolvedCallidescopeWriteConfiguration,
} from "@callidescope/configuration";

/** Arguments for building one section per project the fan-out still reaches. */
export interface BuildProjectSectionsArguments {
  readonly destination: ResolvedCallidescopeProjectReadmeConfiguration;
  readonly limits: ProjectLimitsLookup;
  readonly result: CallGraphResult;
  readonly startingProjectRoots: ReadonlyMap<string, string>;
  /** The written destinations each project declared for itself, by name. */
  readonly writeByProject: ReadonlyMap<
    string,
    ResolvedCallidescopeWriteConfiguration
  >;
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
   * name. Only these projects have a section published, so a scoped run never
   * writes into a dependency it merely measured.
   */
  readonly startingProjectRoots: ReadonlyMap<string, string>;
  /**
   * The written destinations each project declared for itself, by name.
   *
   * A project named here publishes to what it declared and is left out of the
   * workspace README fan-out entirely. Both would otherwise write a section
   * for it, and a project declaring `README.md` under a heading of its own
   * would have the two overwrite each other run after run.
   */
  readonly writeByProject: ReadonlyMap<
    string,
    ResolvedCallidescopeWriteConfiguration
  >;
}

/** Arguments for writing the destinations one project declared for itself. */
export interface SyncProjectSectionsArguments {
  readonly check: boolean;
  readonly configuration: ResolvedCallidescopeConfiguration;
  /** The depth and breadth limits each traced project is judged against. */
  readonly projectLimits: ProjectLimitsLookup;
  /** The findings for the one project these destinations belong to. */
  readonly report: ProjectReport;
  readonly result: CallGraphResult;
  /** Workspace-relative root every declared path is read against. */
  readonly root: string;
  readonly write: ResolvedCallidescopeWriteConfiguration;
}
