import { Injectable } from "@nestjs/common";

import {
  HCL_BLOCK_COMMENT_PATTERN,
  HCL_HASH_LINE_COMMENT_PATTERN,
  HCL_SLASH_LINE_COMMENT_PATTERN,
} from "./comments.constants";

import type { CommentToken } from "./comments.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Reads HCL's `#`, `//`, and `/* ... *\/` comments — the only language this
 * tool measures that marks a comment three different ways.
 *
 * A line scanner for the two line forms and a span match for the block form,
 * none of it string-aware: `HclService`'s own line-based counting already
 * accepts the same limitation, checking only whether a trimmed line's first
 * characters open a comment rather than parsing the language properly.
 */
@Injectable()
/* v8 ignore stop */
export class HclCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether only whitespace precedes an offset on its own line. */
  private isOwnLine(content: string, index: number): boolean {
    const lineStart = content.lastIndexOf("\n", index - 1) + 1;

    return content.slice(lineStart, index).trim() === "";
  }

  /** The 1-indexed line an offset sits on. */
  private lineOf(content: string, index: number): number {
    return content.slice(0, index).split("\n").length;
  }

  /** Every match of a comment pattern, as a positioned token. */
  private readMatches(
    content: string,
    pattern: RegExp,
    stripMarker: (source: string) => string,
  ): { end: number; start: number; token: CommentToken }[] {
    return [...content.matchAll(pattern)].map((match) => {
      const source = match[0];
      const start = match.index;

      return {
        end: start + source.length,
        start,
        token: {
          line: this.lineOf(content, start),
          ownLine: this.isOwnLine(content, start),
          prose: stripMarker(source),
          source,
        },
      };
    });
  }

  // 🌎 Public Methods

  /**
   * Reads every `#`, `//`, and `/* *\/` comment, in the order they appear.
   *
   * Block matches are found first so a line marker found inside one — a `#`
   * written as prose in a `/* *\/` block, say — can be dropped rather than
   * measured a second time as a comment of its own.
   */
  read(content: string): CommentToken[] {
    const blocks = this.readMatches(
      content,
      HCL_BLOCK_COMMENT_PATTERN,
      (source) => source.slice(2, -2),
    );
    const overlapsBlock = (start: number): boolean =>
      blocks.some((block) => start >= block.start && start < block.end);

    const hashLines = this.readMatches(
      content,
      HCL_HASH_LINE_COMMENT_PATTERN,
      (source) => source.slice(1),
    ).filter((line) => !overlapsBlock(line.start));
    const slashLines = this.readMatches(
      content,
      HCL_SLASH_LINE_COMMENT_PATTERN,
      (source) => source.slice(2),
    ).filter((line) => !overlapsBlock(line.start));

    return [...blocks, ...hashLines, ...slashLines]
      .toSorted((first, second) => first.start - second.start)
      .map(({ token }) => token);
  }
}
