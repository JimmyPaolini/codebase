import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import { CommentsService } from "../comments/comments.service";

import { SYMBOL_KIND_BY_SYNTAX_KIND } from "./typescript.constants";

import type { CommentMeasurement } from "../comments/comments.types";
import type { TypescriptWalkContext } from "./typescript.types";

/**
 * Finds a documentable declaration's leading JSDoc comment and hands it to be
 * measured.
 *
 * Only the finding is TypeScript's: which declarations can carry a limit,
 * where the `/**` range sits, and what the declaration is called. How long the
 * comment is comes from `CommentsService`, the same counting every other
 * language's comments go through, so a word means one thing across the tool
 * rather than one thing per analyzer.
 */
@Injectable()
export class DocumentationMeasurementService {
  // 🏗 Dependency Injection

  constructor(private readonly comments: CommentsService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads a declaration's own name, or `"(anonymous)"` when it has none. */
  private getDeclarationName(node: tsCompiler.Node): string {
    const nodeWithName = node as tsCompiler.Node & {
      name?: { getText?: () => string };
    };

    return nodeWithName.name?.getText?.() ?? "(anonymous)";
  }

  /** Finds the node's leading JSDoc comment range, the last one if several. */
  private getJsDocRange(
    node: tsCompiler.Node,
    sourceFile: tsCompiler.SourceFile,
  ): tsCompiler.CommentRange | undefined {
    return (
      tsCompiler.getLeadingCommentRanges(
        sourceFile.text,
        node.getFullStart(),
      ) ?? []
    ).findLast(
      (candidate) =>
        candidate.kind === tsCompiler.SyntaxKind.MultiLineCommentTrivia &&
        sourceFile.text.slice(candidate.pos, candidate.pos + 3) === "/**",
    );
  }

  /**
   * The comment's prose, with its delimiters and each line's `*` stripped.
   *
   * Stripped for the word count only. A character count stays the raw slice —
   * it is the one unit a reader can check against their editor's own column
   * count, and a marker is very much a character even though it is not a word.
   */
  private readProse(text: string): string {
    return text
      .replace(/^\/\*\*/u, "")
      .replace(/\*\/$/u, "")
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/u, ""))
      .join(" ");
  }

  // 🌎 Public Methods

  /**
   * Measures one declaration's leading JSDoc comment, if it has one.
   *
   * Empty when the node's kind is not one a documentation limit can name, or
   * when it carries no `/**` comment at all — neither is a measurement, and
   * reporting one would name a declaration nothing documented. A declaration
   * is measured once per maximum its kind declares, because the maxima are not
   * alternatives: one can hold while another breaks.
   */
  measure(
    node: tsCompiler.Node,
    context: TypescriptWalkContext,
  ): CommentMeasurement[] {
    const { documentation, sourceFile } = context;
    const kind = SYMBOL_KIND_BY_SYNTAX_KIND[node.kind];

    if (documentation === undefined || kind === undefined) {
      return [];
    }

    const range = this.getJsDocRange(node, sourceFile);

    if (range === undefined) {
      return [];
    }

    const source = sourceFile.text
      .slice(range.pos, range.end)
      .replaceAll("\r\n", "\n");

    return this.comments.measureText({
      comments: documentation.kinds[kind] ?? documentation,
      declaration: this.getDeclarationName(node),
      filePath: context.filePath,
      kind,
      line:
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          .line + 1,
      prose: this.readProse(source),
      source,
    });
  }
}
