// 🏷️ Types

import type {
  CodometerCommentMeasurement,
  ResolvedCodometerCommentsConfiguration,
  ResolvedCodometerConfiguration,
  ResolvedCodometerLanguageCommentsConfiguration,
} from "@codometer/configuration";
import type { LineCounter } from "yaml";

/** A run of comment lines a reader takes as one thought. */
export interface CommentBlock {
  tokens: CommentToken[];
}

/** One comment block, measured against one declared maximum. */
export type CommentMeasurement = CodometerCommentMeasurement;

/** One comment line, with where it sits and what it says. */
export interface CommentToken {
  /** 1-indexed line the comment is written on. */
  line: number;
  /** Whether nothing but whitespace precedes it on its line. */
  ownLine: boolean;
  /** The comment's prose, with its marker already stripped. */
  prose: string;
  /** The comment exactly as the file carries it, marker and all. */
  source: string;
}

/**
 * The file lists comment measurement reads, one per language that has a
 * budget.
 *
 * Named here rather than taken from `DiscoveredLanguageFiles`, which would
 * point this module back at the one that depends on it. `languages` depends on
 * `comments` and never the reverse; a cycle between the two crashes the Nest
 * container outright rather than failing anything readable. The discovery
 * result satisfies this structurally, so callers pass it unchanged.
 */
export interface LanguageCommentFiles {
  cssFiles: string[];
  hclFiles: string[];
  shellFiles: string[];
  /** TypeScript and JavaScript sources, in every dialect the workspace holds. */
  sourceFiles: string[];
  sqlFiles: string[];
  tomlFiles: string[];
  yamlFiles: string[];
}

/** A comment token together with the file it was found in. */
export interface LocatedCommentToken extends CommentToken {
  file: string;
}

/** Arguments accepted when measuring one file's comment blocks. */
export interface MeasureCommentsArguments {
  comments: ResolvedCodometerLanguageCommentsConfiguration;
  filePath: string;
  tokens: CommentToken[];
}

/** Arguments accepted when measuring one comment's text directly. */
export interface MeasureCommentTextArguments {
  comments: ResolvedCodometerCommentsConfiguration;
  declaration: string;
  filePath: string;
  kind: string;
  line: number;
  /** The comment's prose, with every marker stripped. */
  prose: string;
  /** The comment exactly as the file carries it, markers and all. */
  source: string;
}

/** Arguments accepted when measuring every configured language's comments. */
export interface MeasureLanguageCommentsArguments {
  configuration: ResolvedCodometerConfiguration;
  files: LanguageCommentFiles;
  /**
   * Python's comments, already found by its own analyzer.
   *
   * Python is read in Python: its analysis runs `tokenize` in a subprocess,
   * which knows a `#` inside a string literal from a real comment the way no
   * line scanner can. The tokens arrive here rather than the measurements, so
   * a word still means one thing across every language.
   */
  pythonComments: readonly LocatedCommentToken[];
  workingDirectory: string;
}

/**
 * A comment token with the offset YAML's tree walk needs to order it.
 *
 * The offset is not part of what a comment is — no other reader has one, and
 * Python's tokenizer reports positions rather than offsets — so it stays here
 * rather than on `CommentToken`.
 */
export interface PositionedToken {
  offset: number;
  token: CommentToken;
}

/** One YAML file's in-progress scan: the text, its lines, and what was found. */
export interface YamlCommentScan {
  content: string;
  lineCounter: LineCounter;
  tokens: PositionedToken[];
}
