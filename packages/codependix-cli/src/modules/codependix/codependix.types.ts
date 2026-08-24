// 🏷️ Types

import type { NestjsModuleGraph } from "@codependix/nestjs";
import type { Neighborhood, WorkspaceGraph } from "@codependix/nx";

/** Command-line options `codependix` accepts. */
export interface CodependixCommandOptions {
  check?: boolean | undefined;
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
