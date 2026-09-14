// 🏷️ Types

import type { CodependixRunMode } from "../delivery/delivery.types";
import type {
  CodependixGraphType,
  CodependixProjectConfiguration,
  ResolvedCodependixConfiguration,
} from "@codependix/configuration";
import type {
  PythonImportGraph,
  TypescriptImportGraph,
} from "@codependix/file-imports";
import type { NestjsModuleGraph } from "@codependix/nestjs-modules";
import type {
  Neighborhood,
  NxProject,
  NxProjectGraph,
  WorkspaceGraph,
} from "@codependix/nx-projects";

/**
 * Everything every graph-type pass reads, resolved once per run rather than
 * once per pass — see `MapService.run`.
 */
export interface GraphRunContext {
  configuration: ResolvedCodependixConfiguration;
  /**
   * The graph types this run builds, checks, and writes.
   *
   * All three unless `--no-file-imports`, `--no-nestjs-modules`, or
   * `--no-nx-projects` narrowed it — see `RunContextService.build`. Read by
   * `MapService.run` to skip a whole pass, and by
   * `BoundaryCheckService.run` to skip a boundary level, so a developer can
   * run a narrower, faster check locally without editing configuration.
   */
  enabledGraphTypes: ReadonlySet<CodependixGraphType>;
  graph: NxProjectGraph;
  mode: CodependixRunMode;
  /**
   * Every project's own `codependix.config.ts`, keyed by project name — or
   * `undefined` for a project naming none of its own.
   *
   * Loaded once per run, alongside `projects`, so every pass reads the same
   * snapshot rather than each re-reading the filesystem for every graph type
   * it resolves. Read as-is by `ConfigurationService.resolveForProject` — see
   * that method for why no further merge happens here.
   */
  projectConfigurations: Map<
    string,
    CodependixProjectConfiguration | undefined
  >;
  /** Every project the graph knows, apart from the workspace root. */
  projects: NxProject[];
  /**
   * The projects `--projects` and `--tags` narrowed the run to.
   *
   * Identical to `projects` when a run named neither, which is what keeps the
   * Workspace Graph whole and the boundary gate judging every project by
   * default. `include`/`exclude` never reach this: they decide which projects
   * have exports written, not which projects a graph is drawn over.
   */
  selectedProjects: NxProject[];
  workingDirectory: string;
}

/** Command-line options `codependix` accepts. */
export interface MapCommandOptions {
  /**
   * The set of findings `--check` gates, unparsed.
   *
   * `true` is the flag written with no value at all, which is refused rather
   * than read as a shorthand — see `RunPlanService.selectMode`.
   */
  check?: string | true | undefined;
  config?: string | undefined;
  directory?: string | undefined;
  /** Overrides `exclude` for this run. Refused when never configured. */
  exclude?: string[] | undefined;
  /**
   * Builds, checks, and writes the `fileImports` graph type for this run.
   *
   * `undefined` when neither `--file-imports` nor `--no-file-imports` was
   * given, which leaves the graph type enabled — the behavior every run had
   * before this flag existed.
   */
  fileImports?: boolean | undefined;
  /** Overrides `include` for this run. Refused when never configured. */
  include?: string[] | undefined;
  /** Builds, checks, and writes the `nestjsModules` graph type for this run. */
  nestjsModules?: boolean | undefined;
  /** Builds, checks, and writes the `nxProjects` graph type for this run. */
  nxProjects?: boolean | undefined;
  /**
   * Projects to export for beyond what `include` already selects, unparsed.
   *
   * Comma-separated globs matched against a project's name or its
   * workspace-relative root.
   */
  projects?: string | undefined;
  /** Nx tags to export for beyond what `include` selects, unparsed. */
  tags?: string | undefined;
  write?: boolean | undefined;
}

/**
 * The JSON shape a single project's NestJS module graph export is written as.
 *
 * Identical in shape to `NestjsModuleGraph` itself — kept as its own named
 * type so the export's JSON shape can evolve independently of
 * `codependix-nestjs-modules`'s internal representation, the same reasoning
 * `NxWorkspaceGraphExport` follows for the Nx Workspace Graph.
 */
export type NestjsModuleGraphExport = NestjsModuleGraph;

/** The JSON shape a single project's Nx neighborhood export is written as. */
export interface NxNeighborhoodExport {
  dependencies: string[];
  dependents: string[];
  edges: Neighborhood["edges"];
  projectName: string;
}

/**
 * The JSON shape the whole-workspace Nx Workspace Graph export is written as.
 *
 * Identical in shape to `WorkspaceGraph` itself — no extra field is added the
 * way `NxNeighborhoodExport` adds none beyond `Neighborhood` either — kept as
 * its own named type so the export's JSON shape can evolve independently of
 * `codependix-nx-projects`'s internal `WorkspaceGraph` representation.
 */
export type NxWorkspaceGraphExport = WorkspaceGraph;

/**
 * The JSON shape a single project's Python file-level import graph export is
 * written as.
 *
 * Identical in shape to `PythonImportGraph` itself, kept as its own named
 * type for the same reason `TypescriptImportGraphExport` is.
 */
export type PythonImportGraphExport = PythonImportGraph;

/**
 * The JSON shape a single project's TypeScript file-level import graph
 * export is written as.
 *
 * Identical in shape to `TypescriptImportGraph` itself — kept as its own
 * named type for the same reason `NestjsModuleGraphExport` is: so the
 * export's JSON shape can evolve independently of `codependix-file-imports`'s
 * internal representation.
 */
export type TypescriptImportGraphExport = TypescriptImportGraph;
