// 🏷️ Types

import type ts from "typescript";

/**
 * A workspace project whose own `tsconfig.json` can be turned into a program.
 *
 * Every workspace project is a candidate, unlike `codependix-nestjs`'s
 * `NestjsProject`, which is gated to projects tagged `framework:nestjs` — a
 * file-level import graph is meaningful for any TypeScript project.
 */
export interface TypescriptProject {
  /** Absolute path of the project directory. */
  readonly absoluteRoot: string;
  /** Project directory name, which is also the Nx project name. */
  readonly name: string;
  /** Absolute path of the project's `tsconfig.json`. */
  readonly tsconfigPath: string;
}

/**
 * One project's program together with the compiler host and options that
 * built it.
 *
 * The host and options travel with the program rather than being rebuilt by
 * `ImportGraphService`: resolving an import specifier through
 * `ts.resolveModuleName` needs the exact same host and options the program
 * itself was built with, or module resolution could silently disagree with
 * what the program actually parsed.
 */
export interface TypescriptProjectProgram {
  readonly host: ts.CompilerHost;
  readonly options: ts.CompilerOptions;
  readonly program: ts.Program;
  readonly project: TypescriptProject;
}
