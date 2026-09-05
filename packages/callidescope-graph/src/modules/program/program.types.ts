// 🏷️ Types

import type { WorkspaceProject } from "../workspace/workspace.types";
import type ts from "typescript";

/** Arguments for building every project's program. */
export interface BuildProgramsArguments {
  readonly projects: readonly WorkspaceProject[];
  readonly workspaceRoot: string;
}

/** The programs a run built, and the ownership decisions behind them. */
export interface ProgramSet {
  /** Absolute real path to the program that owns it. */
  readonly ownerByFilePath: ReadonlyMap<string, ProjectProgram>;
  readonly programs: readonly ProjectProgram[];
  /** Projects left out of the graph because they could not be read. */
  readonly skippedProjects: readonly SkippedProject[];
}

/**
 * One project's program, its checker, and the files it owns.
 *
 * A file's declarations are walked exactly once, in the program that owns it.
 * Files pulled in as dependencies are still reachable through the checker, but
 * walking them here as well would double every callable in the graph.
 */
export interface ProjectProgram {
  readonly checker: ts.TypeChecker;
  /** Absolute real paths this program is responsible for walking. */
  readonly ownedFilePaths: ReadonlySet<string>;
  readonly program: ts.Program;
  readonly project: WorkspaceProject;
}

/**
 * A project left out of the graph because its `tsconfig.json` could not be
 * read.
 *
 * Named and carried rather than thrown, so one unreadable configuration costs
 * the run that project instead of every project — and so a host still has
 * something to print and something to fail on.
 */
export interface SkippedProject {
  readonly projectName: string;
  /** The parsing failure, already flattened into a sentence. */
  readonly reason: string;
}
