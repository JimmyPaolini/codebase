import { Injectable } from "@nestjs/common";
import {
  forEachChild,
  getLeadingCommentRanges,
  getTrailingCommentRanges,
  type Node,
  type SourceFile,
} from "typescript";

import { TODO_LINE_REGEX } from "./validator.constants";

import type {
  CommentInfo,
  ConformanceError,
  ConformanceErrorLanguage,
} from "./validator.types";

/**
 * TypeScript comment conformance validator.
 */
@Injectable()
export class ValidatorCommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  /**
   * Builds a missing-comment error.
   */
  private createMissingCommentError(
    templateComment: CommentInfo,
    language: ConformanceErrorLanguage,
  ): ConformanceError {
    return {
      errorType: "comment",
      expected: templateComment.text,
      fix: `Add the comment \`${templateComment.text}\` to the instance file.`,
      instanceColumn: 1,
      instanceLine: 1,
      language,
      message: `Missing comment: "${templateComment.text}"`,
      templateColumn: templateComment.column,
      templateLine: templateComment.line,
    };
  }

  /**
   * Extracts comments from a source file.
   */
  private extractAllComments(sourceFile: SourceFile): CommentInfo[] {
    const text = sourceFile.text;
    const commentsMap = new Map<number, CommentInfo>();

    const extract = (node: Node): void => {
      const leadingCommentRanges =
        getLeadingCommentRanges(text, node.pos) ?? [];
      const trailingCommentRanges =
        getTrailingCommentRanges(text, node.end) ?? [];

      for (const commentRange of [
        ...leadingCommentRanges,
        ...trailingCommentRanges,
      ]) {
        if (!commentsMap.has(commentRange.pos)) {
          const { character, line } = sourceFile.getLineAndCharacterOfPosition(
            commentRange.pos,
          );
          commentsMap.set(commentRange.pos, {
            column: character + 1,
            line: line + 1,
            pos: commentRange.pos,
            text: text.slice(commentRange.pos, commentRange.end).trim(),
          });
        }
      }
      forEachChild(node, extract);
    };

    extract(sourceFile);

    return [...commentsMap.values()].toSorted((a, b) => a.pos - b.pos);
  }

  /**
   * Matches template comments, allowing TODO placeholders.
   */
  private matchesTemplateComment(
    templateComment: CommentInfo,
    instanceComment: CommentInfo,
  ): boolean {
    return TODO_LINE_REGEX.test(templateComment.text)
      ? true
      : instanceComment.text === templateComment.text;
  }

  /**
   * Validates that all template comments appear in the instance in order.
   */
  validateAllComments(args: {
    instanceFile: SourceFile;
    language: ConformanceErrorLanguage;
    templateFile: SourceFile;
  }): ConformanceError[] {
    const { instanceFile, language, templateFile } = args;
    const errors: ConformanceError[] = [];
    const templateComments = this.extractAllComments(templateFile);
    const instanceComments = this.extractAllComments(instanceFile);
    let startPosition = 0;
    for (const templateComment of templateComments) {
      const endPosition = instanceComments
        .slice(startPosition)
        .findIndex((comment) =>
          this.matchesTemplateComment(templateComment, comment),
        );
      if (endPosition === -1) {
        errors.push(this.createMissingCommentError(templateComment, language));
      } else {
        startPosition += endPosition + 1;
      }
    }
    return errors;
  }
}
