// 🏷️ Types

import type { CodependixRunMode } from "../delivery/delivery.types";
import type { ResolvedCodependixConfiguration } from "@codependix/configuration";
import type {
  PythonImportGraph,
  TypescriptImportGraph,
} from "@codependix/imports";
import type { NestjsModuleGraph } from "@codependix/nestjs";
import type { Neighborhood, NxProject, WorkspaceGraph } from "@codependix/nx";
import type { ProjectGraph } from "@nx/devkit";

/**
 * Everything every graph-type pass reads, resolved once per run rather than
 * once per pass — see `MapService.run`.
 */
export interface GraphRunContext {
  configuration: ResolvedCodependixConfiguration;
  graph: ProjectGraph;
  mode: CodependixRunMode;
  projects: NxProject[];
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
  write?: boolean | undefined;
}

/**
 * The JSON shape a single project's NestJS module graph export is written as.
 *
 * Identical in shape to `NestjsModuleGraph` itself — kept as its own named
 * type so the export's JSON shape can evolve independently of
 * `codependix-nestjs`'s internal representation, the same reasoning
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
 * `codependix-nx`'s internal `WorkspaceGraph` representation.
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
 * export's JSON shape can evolve independently of `codependix-imports`'s
 * internal representation.
 */
export type TypescriptImportGraphExport = TypescriptImportGraph;
