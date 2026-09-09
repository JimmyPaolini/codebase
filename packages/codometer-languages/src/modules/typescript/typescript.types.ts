// 🏷️ Types

import type {
  CommentMeasurement,
  DocumentationCommentCounter,
} from "../comments/comments.types";
import type {
  CodometerSymbolKind,
  CodometerSymbolModifier,
} from "@codometer/configuration";
import type { SourceFile } from "typescript";

/** Arguments for analyzing a single source file. */
export interface AnalyzeTypescriptFileArguments {
  counters: TypescriptSymbolCounter[];
  documentationCounters: DocumentationCommentCounter[];
  filePath: string;
  stats: TypescriptResult;
  workingDirectory: string;
}

/** Everything one walk of one file's AST needs to carry down the tree. */
/**
 * Everything one node's JSDoc measurement needs, gathered before any counting.
 *
 * Exists so `DocumentationMeasurementService.measure` can stay inside this
 * repository's statement budget without putting a helper on the measuring path
 * itself, where it would deepen the stack the depth gate holds.
 */
export interface PreparedDocumentation {
  counters: DocumentationCommentCounter[];
  declaration: string;
  kind: CodometerSymbolKind;
  line: number;
  prose: string;
  source: string;
}

/** Input to the TypeScript/JavaScript AST analysis step. */
export interface TypescriptInput {
  /**
   * One `comment`-selector custom statistic's budget over one documentable
   * declaration kind, tallied during the same walk.
   *
   * Empty when the repository's configuration declares no such statistic,
   * which is what skips measurement entirely rather than measuring against a
   * limit nobody chose.
   */
  documentationCounters: DocumentationCommentCounter[];
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
  /** One measurement list per configured documentation counter, keyed by its label. */
  documentationCounts: Record<string, CommentMeasurement[]>;
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

/**
 * What one file's AST walk carries with it, node to node.
 *
 * Narrowed once per file rather than rebuilt per node: which counters search a
 * file depends on its path, and the path does not change as the walk descends.
 */
export interface TypescriptWalkContext {
  /**
   * The symbol counters that apply to the file being walked.
   *
   * Narrowed once per file rather than per node: which counters search a file
   * depends on its path, which does not change as the walk descends.
   */
  counters: TypescriptSymbolCounter[];
  documentationCounters: DocumentationCommentCounter[];
  filePath: string;
  insideClass: boolean;
  sourceFile: SourceFile;
  stats: TypescriptResult;
}
