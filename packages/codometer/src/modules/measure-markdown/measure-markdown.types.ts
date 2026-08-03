// 🏷️ Types

/** Minimal markdown AST node shape required for recursive counting. */
export interface MarkdownCountNode {
  children?: readonly MarkdownCountNode[];
  type: string;
}

/** Input to the markdown analysis step. */
export interface MeasureMarkdownInput {
  markdownFiles: string[];
  workingDirectory: string;
}

/** Aggregated metrics collected from markdown abstract syntax trees. */
export interface MeasureMarkdownResult {
  blockquotes: number;
  codeBlocks: number;
  files: number;
  headers: number;
  images: number;
  inlineCode: number;
  lines: number;
  links: number;
  listItems: number;
  lists: number;
  markdownElements: number;
  otherMarkdownElements: number;
  paragraphs: number;
  tables: number;
  thematicBreaks: number;
}
