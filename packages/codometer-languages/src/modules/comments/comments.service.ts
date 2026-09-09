import { Injectable } from "@nestjs/common";

import {
  COMMENT_EXCERPT_LENGTH,
  COMMENT_KIND,
  FILE_COMMENT_DECLARATION,
  FILE_COMMENT_KIND,
} from "./comments.constants";

import type {
  CommentBlock,
  CommentBudget,
  CommentMeasurement,
  CommentToken,
  MeasureCommentsArguments,
  MeasureCommentTextArguments,
} from "./comments.types";
import type { CodometerDocumentationUnit } from "@codometer/configuration";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Measures comments against the maxima a configuration declares.
 *
 * Everything here is language-agnostic: it takes comments somebody else
 * already found and says how long they are. What counts as a comment differs
 * per language and lives with the reader that knows — `HashCommentsService`
 * for the `#` languages, `YamlCommentsService` for YAML's tokenizer, and the
 * TypeScript walk for a JSDoc block.
 *
 * That split is what keeps one definition of a word, a line, and a character
 * across every language, rather than four analyzers each counting slightly
 * differently.
 */
@Injectable()
/* v8 ignore stop */
export class CommentsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Counts the words in a comment's prose, markers already stripped. */
  private countWords(prose: string): number {
    return prose
      .trim()
      .split(/\s+/u)
      .filter((word) => word.length > 0).length;
  }

  /** Every declared maximum, paired with what this comment measured. */
  private declaredLimits(
    args: { prose: string; source: string },
    comments: CommentBudget,
  ): { limit: number; measured: number; unit: CodometerDocumentationUnit }[] {
    const declared: {
      limit: number | undefined;
      measured: () => number;
      unit: CodometerDocumentationUnit;
    }[] = [
      {
        limit: comments.maximumCharacters,
        measured: () => args.source.length,
        unit: "characters",
      },
      {
        limit: comments.maximumLines,
        measured: () => args.source.split("\n").length,
        unit: "lines",
      },
      {
        limit: comments.maximumWords,
        measured: () => this.countWords(args.prose),
        unit: "words",
      },
    ];

    return declared.flatMap(({ limit, measured, unit }) =>
      limit === undefined ? [] : [{ limit, measured: measured(), unit }],
    );
  }

  /**
   * Measures every comment in one file together, if a file budget was written.
   *
   * Nothing when none was, which is the normal case: a budget is usually about
   * one explanation that got away from its author, and blocks are what say
   * that. A file holding forty well-sized comments is a different thing from
   * one holding a single essay, and only the block reading tells them apart.
   *
   * A file with no comments at all is not reported — there is nothing there to
   * be too long.
   */
  private measureFile(args: MeasureCommentsArguments): CommentMeasurement[] {
    const { file } = args.comments;

    if (file === undefined || args.tokens.length === 0) {
      return [];
    }

    return this.measureText({
      comments: file,
      declaration: FILE_COMMENT_DECLARATION,
      filePath: args.filePath,
      kind: FILE_COMMENT_KIND,
      line: args.tokens[0]?.line ?? 1,
      prose: this.readProse(args.tokens),
      source: this.readSource(args.tokens),
    });
  }

  /** The prose of a run of comment lines, markers already stripped. */
  private readProse(tokens: readonly CommentToken[]): string {
    return tokens
      .map((token) => token.prose)
      .join(" ")
      .trim();
  }

  /** A run of comment lines exactly as the file carries them. */
  private readSource(tokens: readonly CommentToken[]): string {
    return tokens.map((token) => token.source).join("\n");
  }

  /** Shortens a block's prose to something a breach line can carry. */
  private toExcerpt(prose: string): string {
    return prose.length > COMMENT_EXCERPT_LENGTH
      ? `${prose.slice(0, COMMENT_EXCERPT_LENGTH)}…`
      : prose;
  }

  // 🌎 Public Methods

  /**
   * Groups a file's comment lines into the blocks a reader perceives.
   *
   * A trailing comment never joins anything — it sits after a value and is
   * read with that value, not with the prose above it — and neither does a
   * comment separated from the previous one by a blank line, which is how a
   * writer marks the end of a thought.
   */
  groupIntoBlocks(tokens: readonly CommentToken[]): CommentBlock[] {
    const blocks: CommentBlock[] = [];

    for (const token of tokens) {
      const previous = blocks.at(-1);
      const last = previous?.tokens.at(-1);

      if (
        previous !== undefined &&
        last !== undefined &&
        token.ownLine &&
        last.ownLine &&
        token.line === last.line + 1
      ) {
        previous.tokens.push(token);
        continue;
      }

      blocks.push({ tokens: [token] });
    }

    return blocks;
  }

  /**
   * Measures every block a file's comment tokens form, breached or not.
   *
   * Every block is reported rather than only the breaches, so a length is
   * visible in the JSON report before it ever becomes a problem — the same
   * bargain the TypeScript documentation measurement makes. A block is
   * reported once per declared maximum, because the maxima are not
   * alternatives: one can hold while another breaks.
   */
  measure(args: MeasureCommentsArguments): CommentMeasurement[] {
    const blocks = this.groupIntoBlocks(args.tokens).flatMap((block) => {
      const prose = this.readProse(block.tokens);

      return this.measureText({
        comments: args.comments,
        declaration: this.toExcerpt(prose),
        filePath: args.filePath,
        kind: COMMENT_KIND,
        line: block.tokens[0]?.line ?? 1,
        prose,
        source: this.readSource(block.tokens),
      });
    });

    return [...blocks, ...this.measureFile(args)];
  }

  /**
   * Measures one comment's text against every maximum declared for it.
   *
   * The seam a JSDoc block enters through: it is one comment already, found by
   * the TypeScript walk rather than grouped from lines, so it needs the
   * counting and none of the grouping.
   */
  measureText(args: MeasureCommentTextArguments): CommentMeasurement[] {
    return this.declaredLimits(args, args.comments).map(
      ({ limit, measured, unit }) => ({
        breached: measured > limit,
        declaration: args.declaration,
        file: args.filePath,
        kind: args.kind,
        limit,
        line: args.line,
        measured,
        severity: args.comments.severity,
        unit,
      }),
    );
  }
}
