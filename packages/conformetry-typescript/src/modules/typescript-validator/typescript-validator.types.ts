// 🏷️ Types

import type { Node, SourceFile } from "typescript";

/** Arguments for comparing the comments of two source files. */
export interface CompareCommentsArguments {
  readonly instanceSourceFile: SourceFile;
  readonly templateSourceFile: SourceFile;
}

/** Arguments for walking two syntax trees in parallel. */
export interface CompareTreeArguments {
  readonly instanceNode: Node;
  readonly templateNode: Node;
}

/** A comment extracted from a source file, with its offset for ordering. */
export interface ExtractedComment {
  readonly position: number;
  readonly text: string;
}

/** A declaration the template requires and the instance does not contain. */
export interface TypescriptComparisonError {
  /** Offset in the instance file to anchor the error at, when known. */
  readonly instancePosition: number | undefined;
  /** Syntax-kind label, e.g. `ClassDeclaration`. */
  readonly kindLabel: string;
  /** The node's key — an import specifier, a member name — when it has one. */
  readonly nodeKey: string | undefined;
  /** Offset in the rendered template where the requirement is declared. */
  readonly templatePosition: number | undefined;
}
