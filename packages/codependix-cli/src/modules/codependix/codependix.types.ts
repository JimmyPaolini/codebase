// 🏷️ Types

import type { CodependixRunMode } from "../delivery/delivery.types";
import type { ResolvedCodependixConfiguration } from "@codependix/configuration";
import type { ImportGraph } from "@codependix/imports";
import type { PythonImportGraph } from "@codependix/imports-python";
import type { NestjsModuleGraph } from "@codependix/nestjs";
import type { Neighborhood, NxProject, WorkspaceGraph } from "@codependix/nx";
import type { ProjectGraph } from "@nx/devkit";

/** Command-line options `codependix` accepts. */
export interface CodependixCommandOptions {
  check?: boolean | undefined;
  config?: string | undefined;
  directory?: string | undefined;
  write?: boolean | undefined;
}

/**
 * Everything every graph-type pass reads, resolved once per run rather than
 * once per pass — see `CodependixService.run`.
 */
export interface GraphRunContext {
  configuration: ResolvedCodependixConfiguration;
  graph: ProjectGraph;
  mode: CodependixRunMode;
  projects: NxProject[];
  workingDirectory: string;
}

/**
 * The JSON shape a single project's file-level import graph export is
 * written as.
 *
 * Identical in shape to `ImportGraph` itself — kept as its own named type for
 * the same reason `NestjsModuleGraphExport` is: so the export's JSON shape
 * can evolve independently of `codependix-imports`'s internal representation.
 */
export type ImportGraphExport = ImportGraph;

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
 * type for the same reason `ImportGraphExport` is.
 */
export type PythonImportGraphExport = PythonImportGraph;
