import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

import { EMPTY_MARKDOWN_RESULT } from "./measure-markdown.constants";

import type {
  MarkdownCountNode,
  MeasureMarkdownInput,
  MeasureMarkdownResult,
} from "./measure-markdown.types";

/**
 * Parses markdown files and collects structural metrics from their ASTs.
 */
@Injectable()
export class MeasureMarkdownService {
  // 🏗 Dependency Injection

  /** Creates the MeasureMarkdownService. */
  constructor() {}

  // 🔏 Private Methods

  private readonly countByNodeType: Readonly<
    Record<string, (stats: MeasureMarkdownResult) => void>
  > = {
    blockquote: (stats) => {
      stats.blockquotes++;
      stats.markdownElements++;
    },
    code: (stats) => {
      stats.codeBlocks++;
      stats.markdownElements++;
    },
    heading: (stats) => {
      stats.headers++;
      stats.markdownElements++;
    },
    image: (stats) => {
      stats.images++;
      stats.markdownElements++;
    },
    inlineCode: (stats) => {
      stats.inlineCode++;
      stats.markdownElements++;
    },
    link: (stats) => {
      stats.links++;
      stats.markdownElements++;
    },
    list: (stats) => {
      stats.lists++;
      stats.markdownElements++;
    },
    listItem: (stats) => {
      stats.listItems++;
      stats.markdownElements++;
    },
    paragraph: (stats) => {
      stats.paragraphs++;
      stats.markdownElements++;
    },
    table: (stats) => {
      stats.tables++;
      stats.markdownElements++;
    },
    thematicBreak: (stats) => {
      stats.thematicBreaks++;
      stats.markdownElements++;
    },
  };

  /**
   * Count lines in markdown text while preserving empty-file behavior.
   */
  private countLines(markdownText: string): number {
    return markdownText.length === 0 ? 0 : markdownText.split(/\r?\n/u).length;
  }

  /**
   * Increment counters for a single markdown node type.
   */
  private countNodeType(nodeType: string, stats: MeasureMarkdownResult): void {
    if (nodeType === "text") {
      return;
    }

    const counter = this.countByNodeType[nodeType];

    if (counter) {
      counter(stats);
      return;
    }

    stats.otherMarkdownElements++;
    stats.markdownElements++;
  }

  /**
   * Walk markdown AST nodes recursively and collect node-type metrics.
   */
  private walkNodes(
    nodes: readonly MarkdownCountNode[],
    stats: MeasureMarkdownResult,
  ): void {
    for (const node of nodes) {
      this.countNodeType(node.type, stats);

      const childNodes = node.children;

      if (childNodes && childNodes.length > 0) {
        this.walkNodes(childNodes, stats);
      }
    }
  }

  // 🌎 Public Methods

  /**
   * Analyze markdown files and return aggregate structural metrics.
   */
  analyze({
    markdownFiles,
    workingDirectory,
  }: MeasureMarkdownInput): MeasureMarkdownResult {
    const stats: MeasureMarkdownResult = { ...EMPTY_MARKDOWN_RESULT };
    const markdownProcessor = remark().use(remarkGfm);

    for (const markdownFile of markdownFiles) {
      const markdownContent = readFileSync(
        path.resolve(workingDirectory, markdownFile),
        "utf8",
      );
      const markdownTree = markdownProcessor.parse(markdownContent);

      stats.files++;
      stats.lines += this.countLines(markdownContent);
      this.walkNodes(markdownTree.children, stats);
    }

    return stats;
  }
}
