import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { CommentsService } from "./comments.service";
import { CssCommentsService } from "./css-comments.service";
import { HashCommentsService } from "./hash-comments.service";
import { HclCommentsService } from "./hcl-comments.service";
import { SqlCommentsService } from "./sql-comments.service";
import { TypescriptCommentsService } from "./typescript-comments.service";
import { YamlCommentsService } from "./yaml-comments.service";

import type {
  CommentMeasurement,
  CommentToken,
  LanguageCommentBudget,
  LocatedCommentToken,
  MeasureLanguageCommentsArguments,
} from "./comments.types";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Measures the comment blocks of every language configured to have them.
 *
 * The files are read here rather than inside each language analyzer, which is
 * what lets Python be measured at all: its analysis runs in a subprocess and
 * returns zeros when the interpreter is unreachable, so a gate that lived
 * there would stop gating on any machine without `uv` and say nothing about
 * it. Reading the sources directly makes the budget independent of that.
 */
@Injectable()
/* v8 ignore stop */
export class LanguageCommentsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly comments: CommentsService,
    private readonly cssComments: CssCommentsService,
    private readonly hashComments: HashCommentsService,
    private readonly hclComments: HclCommentsService,
    private readonly logger: LoggerService,
    private readonly sqlComments: SqlCommentsService,
    private readonly typescriptComments: TypescriptCommentsService,
    private readonly yamlComments: YamlCommentsService,
  ) {
    this.logger.setContext(LanguageCommentsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Measures one language's files, if a budget was declared for it. */
  private measureLanguage(args: {
    comments: LanguageCommentBudget | undefined;
    files: readonly string[];
    read: (content: string, filePath: string) => CommentToken[];
    workingDirectory: string;
  }): CommentMeasurement[] {
    if (args.comments === undefined) {
      return [];
    }

    const measurements: CommentMeasurement[] = [];

    for (const filePath of args.files) {
      const content = this.readFile(args.workingDirectory, filePath);

      if (content === undefined) {
        continue;
      }

      measurements.push(
        ...this.comments.measure({
          comments: args.comments,
          filePath,
          tokens: args.read(content, filePath),
        }),
      );
    }

    return measurements;
  }

  /**
   * Measures Python's comments, which its own analyzer already found.
   *
   * The tokens arrive grouped by nothing, so they are split per file before
   * measuring — a block never spans two files, and `groupIntoBlocks` compares
   * line numbers that would otherwise run together.
   */
  private measurePython(
    comments: LanguageCommentBudget | undefined,
    tokens: readonly LocatedCommentToken[],
  ): CommentMeasurement[] {
    if (comments === undefined) {
      return [];
    }

    const byFile = new Map<string, CommentToken[]>();

    for (const { file, ...token } of tokens) {
      const carried = byFile.get(file) ?? [];

      carried.push(token);
      byFile.set(file, carried);
    }

    return [...byFile].flatMap(([filePath, fileTokens]) =>
      this.comments.measure({ comments, filePath, tokens: fileTokens }),
    );
  }

  /** Reads one file, or reports which one it gave up on. */
  private readFile(
    workingDirectory: string,
    filePath: string,
  ): string | undefined {
    try {
      return readFileSync(path.resolve(workingDirectory, filePath), "utf8");
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn("🗒️ Skipped comment measurement", undefined, {
        filePath,
        reason,
      });

      return undefined;
    }
  }

  // 🌎 Public Methods

  /** Measures every language whose configuration declares a comment budget. */
  measure(args: MeasureLanguageCommentsArguments): CommentMeasurement[] {
    const { configuration, files, workingDirectory } = args;
    const readHash = (content: string): CommentToken[] =>
      this.hashComments.read(content);

    return [
      ...this.measureLanguage({
        comments: configuration.css.comments,
        files: files.cssFiles,
        read: (content) => this.cssComments.read(content),
        workingDirectory,
      }),
      ...this.measureLanguage({
        comments: configuration.hcl.comments,
        files: files.hclFiles,
        read: (content) => this.hclComments.read(content),
        workingDirectory,
      }),
      ...this.measurePython(configuration.python.comments, args.pythonComments),
      ...this.measureLanguage({
        comments: configuration.shell.comments,
        files: files.shellFiles,
        read: readHash,
        workingDirectory,
      }),
      ...this.measureLanguage({
        comments: configuration.sql.comments,
        files: files.sqlFiles,
        read: (content) => this.sqlComments.read(content),
        workingDirectory,
      }),
      ...this.measureLanguage({
        comments: configuration.toml.comments,
        files: files.tomlFiles,
        read: readHash,
        workingDirectory,
      }),
      ...this.measureLanguage({
        comments: configuration.typescript.comments,
        files: files.sourceFiles,
        read: (content, filePath) =>
          this.typescriptComments.read(content, filePath),
        workingDirectory,
      }),
      ...this.measureLanguage({
        comments: configuration.yaml.comments,
        files: files.yamlFiles,
        read: (content) => this.yamlComments.read(content),
        workingDirectory,
      }),
    ];
  }
}
