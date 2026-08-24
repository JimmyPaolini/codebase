// 🏷️ Types

import type { Neighborhood } from "@codependix/nx";

/** Command-line options `codependix` accepts. */
export interface CodependixCommandOptions {
  check?: boolean | undefined;
  config?: string | undefined;
  directory?: string | undefined;
  write?: boolean | undefined;
}

/** Which of the two run modes a command line resolved to. */
export type CodependixRunMode = "check" | "write";

/** Arguments shared by every method that delivers one file destination. */
export interface DeliverFileArguments {
  absoluteRoot: string;
  content: string;
  mode: CodependixRunMode;
  relativePath: string;
}

/** The JSON shape a single project's Nx neighborhood export is written as. */
export interface NxNeighborhoodExport {
  dependencies: string[];
  dependents: string[];
  edges: Neighborhood["edges"];
  projectName: string;
}

/** One project's outcome after its configured destinations were resolved. */
export interface ProjectRunResult {
  isCurrent: boolean;
  projectName: string;
  stalePaths: string[];
}
