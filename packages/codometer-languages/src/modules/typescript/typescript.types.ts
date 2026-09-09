// 🏷️ Types

import type {
  CommentMeasurement,
  DocumentationCommentBudget,
} from "../comments/comments.types";
import type {
  CodometerSymbolKind,
  CodometerSymbolModifier,
  ResolvedCodometerDocumentationConfiguration,
} from "@codometer/configuration";
import type { SourceFile } from "typescript";

/** Arguments for analyzing a single source file. */
export interface AnalyzeTypescriptFileArguments {
  counters: TypescriptSymbolCounter[];
  documentation: ResolvedCodometerDocumentationConfiguration | undefined;
  filePath: string;
  stats: TypescriptResult;
  workingDirectory: string;
}

/** Input to the TypeScript/JavaScript AST analysis step. */
export interface TypescriptInput {
  /**
   * How long a documented declaration's JSDoc comment may run.
   *
   * Left undefined when the repository's configuration names no
   * `documentation` block at all, which is what skips measurement entirely
   * rather than measuring against a limit nobody chose.
   */
  documentation?: ResolvedCodometerDocumentationConfiguration | undefined;
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
  /** Every documented declaration, breached or not, in measurement order. */
  documentation: CommentMeasurement[];
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
  documentation: DocumentationCommentBudget | undefined;
  filePath: string;
  insideClass: boolean;
  sourceFile: SourceFile;
  stats: TypescriptResult;
}
