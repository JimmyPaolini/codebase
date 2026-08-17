// 🏷️ Types

import type {
  CodometerSymbolKind,
  CodometerSymbolModifier,
} from "@codometer/configuration";

/** Arguments for analyzing a single source file. */
export interface AnalyzeTypescriptFileArguments {
  counters: TypescriptSymbolCounter[];
  filePath: string;
  stats: TypescriptResult;
  workingDirectory: string;
}

/** Input to the TypeScript/JavaScript AST analysis step. */
export interface TypescriptInput {
  sourceFiles: string[];
  /** Configured counters over declarations, tallied during the same walk. */
  symbolCounters: TypescriptSymbolCounter[];
  workingDirectory: string;
}

/** Aggregated metrics collected from walking TypeScript and JavaScript ASTs. */
export interface TypescriptResult {
  asyncFunctions: number;
  blockComments: number;
  classes: number;
  commentLines: number;
  comments: number;
  constants: number;
  decorators: number;
  docComments: number;
  docTags: Record<string, number>;
  enums: number;
  exported: number;
  externalPackages: Set<string>;
  functions: number;
  genericDeclarations: number;
  imports: number;
  interfaces: number;
  jsFiles: number;
  lineComments: number;
  lines: number;
  methods: number;
  /** One tally per configured symbol counter, keyed by its label. */
  symbolCounts: Record<string, number>;
  syncFunctions: number;
  testFiles: number;
  todos: number;
  tsFiles: number;
}

/** One configured counter over declarations, resolved for the analyzer. */
export interface TypescriptSymbolCounter {
  kinds: CodometerSymbolKind[];
  label: string;
  modifiers: CodometerSymbolModifier[];
  /** Globs narrowing which files are searched; empty searches all of them. */
  patterns: string[];
}

/** Everything one walk of one file's AST needs to carry down the tree. */
export interface TypescriptWalkContext {
  /**
   * The symbol counters that apply to the file being walked.
   *
   * Narrowed once per file rather than per node: which counters search a file
   * depends on its path, which does not change as the walk descends.
   */
  counters: TypescriptSymbolCounter[];
  insideClass: boolean;
  stats: TypescriptResult;
}
