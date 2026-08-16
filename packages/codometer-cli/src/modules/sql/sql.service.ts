import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable, Logger } from "@nestjs/common";

import {
  EMPTY_SQL_RESULT,
  SQL_BLOCK_COMMENT_PATTERN,
  SQL_KEYWORD_PATTERNS,
  SQL_LINE_COMMENT_PATTERN,
} from "./sql.constants";

import type { SqlInput, SqlResult } from "./sql.types";

/**
 * Counts the statements and clauses a SQL script is built from.
 *
 * Comments are stripped before anything is counted, so a `SELECT` inside a
 * `--` explanation is prose rather than a query. Statements are separated on
 * semicolons, which is what the dialect-agnostic reading of a script is.
 */
@Injectable()
export class SqlService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  private readonly logger = new Logger(SqlService.name);

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Records every keyword occurrence in the comment-free source. */
  private countKeywords(source: string, result: SqlResult): void {
    for (const [field, pattern] of SQL_KEYWORD_PATTERNS) {
      result[field] += (source.match(pattern) ?? []).length;
    }
  }

  /** Counts the comments in a script and returns the source without them. */
  private stripComments(content: string, result: SqlResult): string {
    const withoutBlocks = content.replaceAll(SQL_BLOCK_COMMENT_PATTERN, () => {
      result.comments++;
      return " ";
    });

    return withoutBlocks.replaceAll(SQL_LINE_COMMENT_PATTERN, () => {
      result.comments++;
      return " ";
    });
  }

  // 🌎 Public Methods

  /** Analyze the given SQL scripts, resolved against the directory. */
  analyze({ sqlFiles, workingDirectory }: SqlInput): SqlResult {
    const result: SqlResult = { ...EMPTY_SQL_RESULT };

    for (const filePath of sqlFiles) {
      try {
        const content = readFileSync(
          path.resolve(workingDirectory, filePath),
          "utf8",
        );

        result.files++;
        result.lines += content.split("\n").length;

        const source = this.stripComments(content, result);

        result.statements += source
          .split(";")
          .filter((statement) => statement.trim() !== "").length;
        this.countKeywords(source, result);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`🗄️ Skipped SQL analysis for ${filePath}`, undefined, {
          reason: message,
        });
        continue;
      }
    }

    return result;
  }
}
