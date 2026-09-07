import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import type { CommentToken } from "./comments.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Reads TypeScript and JavaScript's `//` and non-JSDoc `/* ... *\/` comments
 * from the compiler's own scanner.
 *
 * Accuracy comes free from the tokenizer: a `//` inside a string or template
 * literal is never scanned as trivia in the first place, which no line
 * scanner could tell apart on its own. A JSDoc `/**` block is skipped here —
 * `DocumentationMeasurementService` already measures those — the same check
 * it uses to find one: the delimiter's first three characters.
 */
@Injectable()
/* v8 ignore stop */
export class TypescriptCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether a comment's raw text is a JSDoc block, measured elsewhere. */
  private isJsDoc(text: string): boolean {
    return text.startsWith("/**");
  }

  /** Whether only whitespace precedes an offset on its own line. */
  private isOwnLine(content: string, index: number): boolean {
    const lineStart = content.lastIndexOf("\n", index - 1) + 1;

    return content.slice(lineStart, index).trim() === "";
  }

  /** The 1-indexed line an offset sits on. */
  private lineOf(content: string, index: number): number {
    return content.slice(0, index).split("\n").length;
  }

  /** Strips a comment's delimiters, leaving its prose. */
  private toProse(text: string): string {
    if (text.startsWith("//")) {
      return text.slice(2);
    }

    return text.replace(/^\/\*/u, "").replace(/\*\/$/u, "");
  }

  // 🌎 Public Methods

  /**
   * Reads every non-JSDoc comment the scanner finds, in source order.
   *
   * `skipTrivia: false` is what leaves comments in the token stream at all —
   * the scanner otherwise treats them the same as whitespace and never
   * surfaces them.
   */
  read(content: string): CommentToken[] {
    const tokens: CommentToken[] = [];
    const scanner = tsCompiler.createScanner(
      tsCompiler.ScriptTarget.Latest,
      false,
      tsCompiler.LanguageVariant.Standard,
      content,
    );

    let kind = scanner.scan();

    while (kind !== tsCompiler.SyntaxKind.EndOfFileToken) {
      if (
        kind === tsCompiler.SyntaxKind.SingleLineCommentTrivia ||
        kind === tsCompiler.SyntaxKind.MultiLineCommentTrivia
      ) {
        const source = scanner.getTokenText();

        if (!this.isJsDoc(source)) {
          const start = scanner.getTokenStart();

          tokens.push({
            line: this.lineOf(content, start),
            ownLine: this.isOwnLine(content, start),
            prose: this.toProse(source),
            source,
          });
        }
      }

      kind = scanner.scan();
    }

    return tokens;
  }
}
