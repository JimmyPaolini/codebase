import { Injectable } from "@nestjs/common";
import ts from "typescript";

import {
  DEPRECATED_TAG,
  SIGNATURE_FORMAT_FLAGS,
  SUMMARY_LIMIT,
  TRUNCATION_SUFFIX,
} from "./annotations.constants";

import type { CallableDeclaration } from "../callables/callables.types";
import type { ReadAnnotationsArguments } from "./annotations.types";
import type {
  CallableDocumentation,
  CallableParameter,
  CallableSignature,
} from "@callidescope/configuration";

/**
 * Reads what a callable says about itself: its signature and its docs.
 *
 * Both come from the type checker rather than the source text, which is what
 * makes them right on the shapes this repository actually writes. An overload's
 * documentation lives on the signature rather than the implementation the graph
 * points at, and a destructured parameter has no name at all in the syntax —
 * the checker resolves both, and reading the comment trivia would not.
 */
@Injectable()
export class AnnotationsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Describes one parameter, including how it may be left out. */
  private readParameter(args: {
    checker: ts.TypeChecker;
    declaration: CallableDeclaration;
    parameter: ts.Symbol;
  }): CallableParameter {
    const { valueDeclaration } = args.parameter;
    const isParameter =
      valueDeclaration !== undefined && ts.isParameter(valueDeclaration);

    return {
      isOptional:
        isParameter &&
        (valueDeclaration.questionToken !== undefined ||
          valueDeclaration.initializer !== undefined),
      isRest: isParameter && valueDeclaration.dotDotDotToken !== undefined,
      name: args.parameter.getName(),
      type: args.checker.typeToString(
        args.checker.getTypeOfSymbolAtLocation(
          args.parameter,
          valueDeclaration ?? args.declaration,
        ),
        undefined,
        SIGNATURE_FORMAT_FLAGS,
      ),
    };
  }

  /** Collapses a documentation comment onto one line, within the limit. */
  private readSummary(args: {
    checker: ts.TypeChecker;
    symbol: ts.Symbol;
  }): string {
    const text = ts
      .displayPartsToString(args.symbol.getDocumentationComment(args.checker))
      .replaceAll(/\s+/g, " ")
      .trim();

    return text.length > SUMMARY_LIMIT
      ? `${text.slice(0, SUMMARY_LIMIT).trimEnd()}${TRUNCATION_SUFFIX}`
      : text;
  }

  /** Resolves the symbol a declaration's documentation hangs off. */
  private readSymbol(args: ReadAnnotationsArguments): ts.Symbol | undefined {
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
   * whether there was prose.
   */
  public readDocumentation(
    args: ReadAnnotationsArguments,
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

  /** Reads what the callable takes and returns. */
  public readSignature(
    args: ReadAnnotationsArguments,
  ): CallableSignature | undefined {
    const signature = args.checker.getSignatureFromDeclaration(
      args.declaration,
    );

    if (signature === undefined) {
      return undefined;
    }

    return {
      parameters: signature.getParameters().map((parameter) =>
        this.readParameter({
          checker: args.checker,
          declaration: args.declaration,
          parameter,
        }),
      ),
      returnType: args.checker.typeToString(
        signature.getReturnType(),
        undefined,
        SIGNATURE_FORMAT_FLAGS,
      ),
      text: args.checker.signatureToString(
        signature,
        args.declaration,
        SIGNATURE_FORMAT_FLAGS,
      ),
    };
  }
}
