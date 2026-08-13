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

/**
 * TypeScript AST utilities used by the TypeScript conformance validator.
 */
@Injectable()
export class ValidatorNodesService {
  // 🏗 Dependency Injection

  constructor() {}

  /**
   * Builds a dotted decorator name from an expression.
   */
  private buildDecoratorName(callee: Node): null | string {
    const parts: string[] = [];
    let current: Node = callee;
    while (isPropertyAccessExpression(current)) {
      parts.unshift(current.name.text);
      current = current.expression;
    }
    if (!isIdentifier(current)) return null;
    parts.unshift(current.text);
    return parts.join(".");
  }

  /**
   * Returns a decorator identity key.
   */
  private getDecoratorKey(node: Decorator): null | string {
    const callee = isCallExpression(node.expression)
      ? node.expression.expression
      : node.expression;
    return this.buildDecoratorName(callee);
  }

  /**
   * Returns an export declaration key.
   */
  private getExportKey(node: ExportDeclaration): null | string {
    const { moduleSpecifier } = node;
    if (moduleSpecifier === undefined) return null;
    return isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : null;
  }

  /**
   * Returns a key for expression statements that call named functions.
   */
  private getExpressionStatementKey(expression: Expression): null | string {
    if (!isCallExpression(expression)) return null;
    const calleeName = this.buildDecoratorName(expression.expression);
    if (calleeName === null) return null;

    const firstArgument = expression.arguments[0];
    if (firstArgument === undefined) return calleeName;

    const firstArgumentKey = this.getLiteralKey(firstArgument);
    return firstArgumentKey === undefined
      ? calleeName
      : `${calleeName}:${firstArgumentKey}`;
  }

  /**
   * Returns an import declaration key.
   */
  private getImportKey(node: ImportDeclaration): null | string {
    const { moduleSpecifier } = node;
    return isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : null;
  }

  /**
   * Returns a literal identity key.
   */
  private getLiteralKey(node: Node): string | undefined {
    if (isIdentifier(node)) return node.text;
    if (isStringLiteral(node)) return node.text;
    if (isNumericLiteral(node)) return node.text;
    if (isBigIntLiteral(node)) return node.text;
    if (isNoSubstitutionTemplateLiteral(node)) return node.text;
    return undefined;
  }

  /**
   * Returns name-based identity key for named nodes.
   */
  private getNamedNodeKey(node: Node): null | string {
    const nameNode = this.isNamedNode(node) ? node.name : undefined;
    if (nameNode === undefined) return null;
    if (isIdentifier(nameNode)) return nameNode.text;
    if (isPrivateIdentifier(nameNode)) return nameNode.text;
    if (isStringLiteral(nameNode)) return nameNode.text;
    if (isNumericLiteral(nameNode)) return nameNode.text;
    return null;
  }

  /**
   * Type guard for nodes with optional name.
   */
  private isNamedNode(node: Node): node is Node & { name?: Node } {
    return "name" in node;
  }

  /**
   * Returns all nodes whose identity key matches the template node key.
   */
  filterBySameKey(instanceNodes: Node[], templateNode: Node): Node[] {
    const templateNodeKey = this.getKey(templateNode);
    return instanceNodes.filter(
      (instanceNode) => this.getKey(instanceNode) === templateNodeKey,
    );
  }

  /**
   * Returns all nodes with the same SyntaxKind as the template node.
   */
  filterBySameKind(instanceNodes: Node[], templateNode: Node): Node[] {
    return instanceNodes.filter(
      (instanceNode) => instanceNode.kind === templateNode.kind,
    );
  }

  /**
   * Returns semantic child nodes, excluding EndOfFileToken.
   */
  getChildren(node: Node): Node[] {
    const children: Node[] = [];
    forEachChild(node, (child) => {
      if (child.kind !== SyntaxKind.EndOfFileToken) {
        children.push(child);
      }
    });
    return children;
  }

  /**
   * Returns a stable identity key for keyed AST nodes, or null.
   */
  getKey(node: Node): null | string {
    if (isImportDeclaration(node)) return this.getImportKey(node);
    if (isExportDeclaration(node)) return this.getExportKey(node);
    if (isDecorator(node)) return this.getDecoratorKey(node);
    if (isExpressionStatement(node)) {
      const expressionStatementKey = this.getExpressionStatementKey(
        node.expression,
      );
      if (expressionStatementKey !== null) return expressionStatementKey;
    }
    const literalKey = this.getLiteralKey(node);
    if (literalKey !== undefined) return literalKey;
    return this.getNamedNodeKey(node);
  }
}
