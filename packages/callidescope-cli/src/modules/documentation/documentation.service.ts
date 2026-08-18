import { Injectable } from "@nestjs/common";
import ts from "typescript";

import {
  DEPRECATED_TAG,
  SUMMARY_LIMIT,
  TRUNCATION_SUFFIX,
} from "./documentation.constants";

import type { ReadDocumentationArguments } from "./documentation.types";
import type { CallableDocumentation } from "@callidescope/configuration";

/**
 * Reads what a callable's documentation comment says about it.
 *
 * Read through the type checker rather than the comment trivia above the node,
 * which is what makes it right on the shapes this repository writes. An
 * overload's comment sits on the signature rather than the implementation the
 * graph points at, and an arrow-typed member's sits on the property rather than
 * the arrow — the checker resolves both to the same symbol, and scanning
 * trivia would find neither.
 */
@Injectable()
export class DocumentationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Collapses a documentation comment onto one line, within the limit. */
  private readSummary(args: {
    checker: ts.TypeChecker;
    symbol: ts.Symbol;
  }): string {
    const text = ts
      .displayPartsToString(args.symbol.getDocumentationComment(args.checker))
      .replaceAll(/\s+/g, " ")
      .trim();

    if (text.length <= SUMMARY_LIMIT) {
      return text;
    }

    // Cut on a word boundary. Slicing at the character leaves half a word,
    // which reads as a typo rather than as an elision — and a spell checker
    // reading the published report agrees. A summary with no space inside the
    // limit is one long token, and cutting it anywhere is equally arbitrary,
    // so cut at the limit.
    const clipped = text.slice(0, SUMMARY_LIMIT);
    const lastSpace = clipped.lastIndexOf(" ");
    const kept = lastSpace === -1 ? clipped : clipped.slice(0, lastSpace);

    return `${kept.trimEnd()}${TRUNCATION_SUFFIX}`;
  }

  /** Resolves the symbol a declaration's documentation hangs off. */
  private readSymbol(args: ReadDocumentationArguments): ts.Symbol | undefined {
    const { checker, declaration } = args;

    if (declaration.name !== undefined) {
      return checker.getSymbolAtLocation(declaration.name);
    }

    // An arrow function has no name of its own; whatever binds it carries the
    // comment, and that is where the checker keeps the symbol too.
    const { parent } = declaration;

    return ts.isPropertyDeclaration(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isVariableDeclaration(parent)
      ? checker.getSymbolAtLocation(parent.name)
      : undefined;
  }

  // 🌎 Public Methods

  /**
   * Reads the documentation comment, if the callable has one.
   *
   * A comment that is nothing but tags — `@deprecated` on its own — leaves the
   * summary empty, so the tags are read separately rather than inferred from
   * whether there was any prose to find.
   */
  public read(
    args: ReadDocumentationArguments,
  ): CallableDocumentation | undefined {
    const symbol = this.readSymbol(args);

    if (symbol === undefined) {
      return undefined;
    }

    const summary = this.readSummary({ checker: args.checker, symbol });
    const tags = symbol
      .getJsDocTags(args.checker)
      .map((tag) => tag.name)
      .filter((name) => name.length > 0);

    if (summary.length === 0 && tags.length === 0) {
      return undefined;
    }

    return {
      isDeprecated: tags.includes(DEPRECATED_TAG),
      summary,
      tags: [...new Set(tags)],
    };
  }
}
