// ♟️ Constants

import type { MeasureMarkdownResult } from "./measure-markdown.types";

/** Empty markdown metric result used as the accumulator seed. */
export const EMPTY_MARKDOWN_RESULT: MeasureMarkdownResult = {
  blockquotes: 0,
  codeBlocks: 0,
  files: 0,
  headers: 0,
  images: 0,
  inlineCode: 0,
  lines: 0,
  links: 0,
  listItems: 0,
  lists: 0,
  markdownElements: 0,
  otherMarkdownElements: 0,
  paragraphs: 0,
  tables: 0,
  thematicBreaks: 0,
};
