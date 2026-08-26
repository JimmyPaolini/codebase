import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import { SYMBOL_KIND_BY_SYNTAX_KIND } from "./typescript.constants";

import type {
  TypescriptDocumentationMeasurement,
  TypescriptWalkContext,
} from "./typescript.types";
import type { CodometerDocumentationUnit } from "@codometer/configuration";

/**
 * Measures a documentable declaration's leading JSDoc comment against the
 * limit its kind carries.
 *
 * Split out of `TypescriptService` so the three counting strategies — lines,
 * characters, words — and the comment-range lookup they share have a home of
 * their own, separate from the AST walk that finds the declarations to
 * measure.
 */
@Injectable()
export class DocumentationMeasurementService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Counts every non-whitespace character, markers and all. */
  private countCharacters(text: string): number {
    return text.length;
  }

  /** Counts the lines the comment block spans, markers and all. */
  private countLines(text: string): number {
    return text.split("\n").length;
  }

  /**
   * Counts the words in the comment's prose.
   *
   * The opening and closing comment delimiters and each line's leading `*` are stripped first,
   * so they are never themselves counted as a word — a five-line comment
   * whose every line opens with `*` would otherwise measure five words too
   * many.
   */
  private countWords(text: string): number {
    const prose = text
      .replace(/^\/\*\*/, "")
      .replace(/\*\/$/, "")
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, ""))
      .join(" ");

    return prose
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

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

  /** Measures a comment's raw text in the configured unit. */
  private measureLength(
    text: string,
    unit: CodometerDocumentationUnit,
  ): number {
    if (unit === "characters") {
      return this.countCharacters(text);
    }

    if (unit === "words") {
      return this.countWords(text);
    }

    return this.countLines(text);
  }

  // 🌎 Public Methods

  /**
   * Measures one declaration's leading JSDoc comment, if it has one.
   *
   * `undefined` when the node's kind is not one a documentation limit can
   * name, or when it carries no `/**` comment at all — neither is a
   * measurement, and pushing one would report a declaration nothing
   * documented.
   */
  measure(
    node: tsCompiler.Node,
    context: TypescriptWalkContext,
  ): TypescriptDocumentationMeasurement | undefined {
    const { documentation, sourceFile } = context;
    const kind = SYMBOL_KIND_BY_SYNTAX_KIND[node.kind];

    if (documentation === undefined || kind === undefined) {
      return undefined;
    }

    const range = this.getJsDocRange(node, sourceFile);

    if (range === undefined) {
      return undefined;
    }

    const text = sourceFile.text
      .slice(range.pos, range.end)
      .replaceAll("\r\n", "\n");
    const measured = this.measureLength(text, documentation.unit);
    const limit = documentation.kinds[kind] ?? documentation.default;

    return {
      breached: measured > limit,
      declaration: this.getDeclarationName(node),
      file: context.filePath,
      kind,
      limit,
      line:
        sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
          .line + 1,
      measured,
      severity: documentation.severity,
      unit: documentation.unit,
    };
  }
}
