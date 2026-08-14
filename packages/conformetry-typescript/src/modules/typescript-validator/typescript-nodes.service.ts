import { Injectable } from "@nestjs/common";
import {
  type Decorator,
  type ExportDeclaration,
  type Expression,
  forEachChild,
  type ImportDeclaration,
  isBigIntLiteral,
  isCallExpression,
  isDecorator,
  isExportDeclaration,
  isExpressionStatement,
  isIdentifier,
  isImportDeclaration,
  isNoSubstitutionTemplateLiteral,
  isNumericLiteral,
  isPrivateIdentifier,
  isPropertyAccessExpression,
  isStringLiteral,
  type Node,
  SyntaxKind,
} from "typescript";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Derives a stable identity for a syntax node.
 *
 * Matching by key rather than by position is what lets a file reorder its
 * members, or add new ones, without failing validation: an import is
 * identified by its module specifier, a member by its name, a decorator by its
 * dotted callee. Nodes with no meaningful key fall back to matching on syntax
 * kind alone.
 */
@Injectable()
/* v8 ignore stop */
export class TypescriptNodesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds a dotted name such as `Nest.Injectable` from a callee expression. */
  private buildDottedName(callee: Node): null | string {
    const parts: string[] = [];
    let currentNode: Node = callee;

    while (isPropertyAccessExpression(currentNode)) {
      parts.unshift(currentNode.name.text);
      currentNode = currentNode.expression;
    }

    if (!isIdentifier(currentNode)) {
      return null;
    }

    parts.unshift(currentNode.text);

    return parts.join(".");
  }

  /** Returns whether a value looks like a syntax node. */
  private isNode(value: unknown): value is Node {
    return (
      typeof value === "object" &&
      value !== null &&
      "kind" in value &&
      typeof value.kind === "number"
    );
  }

  /** Keys a decorator by its callee, so `@Injectable()` matches `@Injectable`. */
  private readDecoratorKey(node: Decorator): null | string {
    return this.buildDottedName(
      isCallExpression(node.expression)
        ? node.expression.expression
        : node.expression,
    );
  }

  /** Keys an export by its module specifier, when it re-exports one. */
  private readExportKey(node: ExportDeclaration): null | string {
    const { moduleSpecifier } = node;

    if (moduleSpecifier === undefined || !isStringLiteral(moduleSpecifier)) {
      return null;
    }

    return moduleSpecifier.text;
  }

  /**
   * Keys a call statement by its callee plus its first literal argument, so
   * two `describe("...")` blocks are told apart by their subject.
   */
  private readExpressionStatementKey(expression: Expression): null | string {
    if (!isCallExpression(expression)) {
      return null;
    }

    const calleeName = this.buildDottedName(expression.expression);

    if (calleeName === null) {
      return null;
    }

    const firstArgument = expression.arguments[0];
    const firstArgumentKey =
      firstArgument === undefined
        ? undefined
        : this.readLiteralKey(firstArgument);

    return firstArgumentKey === undefined
      ? calleeName
      : `${calleeName}:${firstArgumentKey}`;
  }

  /** Keys an import by its module specifier. */
  private readImportKey(node: ImportDeclaration): null | string {
    /* v8 ignore next -- a module specifier is always a string literal */
    return isStringLiteral(node.moduleSpecifier)
      ? node.moduleSpecifier.text
      : null;
  }

  /** Reads a literal's text, for nodes that are themselves a value. */
  private readLiteralKey(node: Node): string | undefined {
    if (
      isIdentifier(node) ||
      isStringLiteral(node) ||
      isNumericLiteral(node) ||
      isBigIntLiteral(node) ||
      isNoSubstitutionTemplateLiteral(node)
    ) {
      return node.text;
    }

    return undefined;
  }

  /** Reads a declaration's own name, when it has one. */
  private readNamedKey(node: Node): null | string {
    if (!("name" in node)) {
      return null;
    }

    const candidate: unknown = node.name;

    if (!this.isNode(candidate)) {
      return null;
    }

    if (
      isIdentifier(candidate) ||
      /* v8 ignore next -- a private name cannot be a call argument */
      isPrivateIdentifier(candidate) ||
      isStringLiteral(candidate) ||
      isNumericLiteral(candidate)
    ) {
      return candidate.text;
    }

    /* v8 ignore next -- a call is keyed before a non-literal argument is read */
    return null;
  }

  // 🌎 Public Methods

  /** Reads a node's direct children, skipping the end-of-file token. */
  public readChildren(node: Node): Node[] {
    const children: Node[] = [];

    forEachChild(node, (childNode) => {
      if (childNode.kind !== SyntaxKind.EndOfFileToken) {
        children.push(childNode);
      }
    });

    return children;
  }

  /**
   * Reads a node's identity, or `null` when it has none.
   *
   * A `null` key means the node can only be matched by syntax kind — which is
   * why an anonymous statement is satisfied by any statement of that kind.
   */
  public readKey(node: Node): null | string {
    if (isImportDeclaration(node)) {
      return this.readImportKey(node);
    }

    if (isExportDeclaration(node)) {
      return this.readExportKey(node);
    }

    if (isDecorator(node)) {
      return this.readDecoratorKey(node);
    }

    if (isExpressionStatement(node)) {
      const expressionKey = this.readExpressionStatementKey(node.expression);

      if (expressionKey !== null) {
        return expressionKey;
      }
    }

    return this.readLiteralKey(node) ?? this.readNamedKey(node);
  }

  /** Reads a node's syntax-kind label, for error messages. */
  public readKindLabel(node: Node): string {
    return SyntaxKind[node.kind];
  }
}
