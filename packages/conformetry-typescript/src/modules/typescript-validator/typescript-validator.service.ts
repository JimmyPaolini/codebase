import { access } from "node:fs/promises";
import path from "node:path";

import { prepareTemplateValidationPayload } from "@jimmypaolini/conformetry-configuration";
import { Injectable } from "@nestjs/common";
import {
  createSourceFile,
  type Decorator,
  type ExportDeclaration,
  type Expression,
  forEachChild,
  getLeadingCommentRanges,
  getTrailingCommentRanges,
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
  ScriptKind,
  ScriptTarget,
  type SourceFile,
  SyntaxKind,
} from "typescript";

import {
  TODO_LINE_REGEX,
  TYPESCRIPT_VALIDATOR_FILE_EXTENSIONS,
  TYPESCRIPT_VALIDATOR_PLUGIN_DESCRIPTOR,
} from "./typescript-validator.constants.js";

import type {
  ExtractedComment,
  TypeScriptValidatorValidateArguments,
  TypeScriptValidatorValidateResult,
  ValidateCommentsArguments,
  ValidateDepthFirstSearchArguments,
  ValidatePathExistenceArguments,
} from "./typescript-validator.types.js";

/** Validates TypeScript files against conformetry templates. */
@Injectable()
export class TypeScriptValidatorService {
  public readonly pluginDescriptor = TYPESCRIPT_VALIDATOR_PLUGIN_DESCRIPTOR;
  /** Builds a dotted name for decorators and callable member expressions. */
  private buildDecoratorName(callee: Node): null | string {
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
  /** Extracts and de-duplicates comments from a source file. */
  private extractAllComments(sourceFile: SourceFile): ExtractedComment[] {
    const sourceText = sourceFile.text;
    const extractedComments = new Map<number, ExtractedComment>();

    const extractComments = (node: Node): void => {
      const leadingCommentRanges =
        getLeadingCommentRanges(sourceText, node.pos) ?? [];
      const trailingCommentRanges =
        getTrailingCommentRanges(sourceText, node.end) ?? [];

      for (const commentRange of [
        ...leadingCommentRanges,
        ...trailingCommentRanges,
      ]) {
        if (extractedComments.has(commentRange.pos)) {
          continue;
        }

        extractedComments.set(commentRange.pos, {
          position: commentRange.pos,
          text: sourceText.slice(commentRange.pos, commentRange.end).trim(),
        });
      }

      forEachChild(node, extractComments);
    };

    extractComments(sourceFile);

    return [...extractedComments.values()].toSorted(
      (leftComment, rightComment) => {
        return leftComment.position - rightComment.position;
      },
    );
  }
  /** Internal helper method. */
  private findMatchingKeyChild(args: {
    readonly instanceChildren: Node[];
    readonly templateNodeKey: string;
  }): Node | undefined {
    return args.instanceChildren.find((instanceChild) => {
      return this.getNodeKey(instanceChild) === args.templateNodeKey;
    });
  }
  /** Internal helper method. */
  private findMinimumViolationCandidate(args: {
    readonly sameKindChildren: Node[];
    readonly templateChild: Node;
  }): string[] {
    const nestedViolationsByCandidate = args.sameKindChildren.map(
      (sameKindChild) => {
        return this.validateDepthFirstSearch({
          instanceNode: sameKindChild,
          templateNode: args.templateChild,
        });
      },
    );

    return nestedViolationsByCandidate.reduce(
      (minimumViolations, candidateViolations) => {
        return candidateViolations.length < minimumViolations.length
          ? candidateViolations
          : minimumViolations;
      },
    );
  }
  /** Internal helper method. */
  private getChildren(node: Node): Node[] {
    const children: Node[] = [];

    forEachChild(node, (childNode) => {
      if (childNode.kind !== SyntaxKind.EndOfFileToken) {
        children.push(childNode);
      }
    });

    return children;
  }
  /** Internal helper method. */
  private getDecoratorKey(node: Decorator): null | string {
    const callee = isCallExpression(node.expression)
      ? node.expression.expression
      : node.expression;

    return this.buildDecoratorName(callee);
  }
  /** Internal helper method. */
  private getExportKey(node: ExportDeclaration): null | string {
    const { moduleSpecifier } = node;
    if (moduleSpecifier === undefined) {
      return null;
    }

    return isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : null;
  }
  /** Internal helper method. */
  private getExpressionStatementKey(expression: Expression): null | string {
    if (!isCallExpression(expression)) {
      return null;
    }

    const calleeName = this.buildDecoratorName(expression.expression);
    if (calleeName === null) {
      return null;
    }

    const firstArgument = expression.arguments[0];
    if (firstArgument === undefined) {
      return calleeName;
    }

    const firstArgumentKey = this.getLiteralKey(firstArgument);
    return firstArgumentKey === undefined
      ? calleeName
      : `${calleeName}:${firstArgumentKey}`;
  }
  /** Internal helper method. */
  private getImportKey(node: ImportDeclaration): null | string {
    const { moduleSpecifier } = node;
    return isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : null;
  }
  /** Internal helper method. */
  private getKindLabel(node: Node): string {
    return SyntaxKind[node.kind];
  }
  /** Internal helper method. */
  private getLiteralKey(node: Node): string | undefined {
    if (isIdentifier(node)) {
      return node.text;
    }

    if (isStringLiteral(node)) {
      return node.text;
    }

    if (isNumericLiteral(node)) {
      return node.text;
    }

    if (isBigIntLiteral(node)) {
      return node.text;
    }

    if (isNoSubstitutionTemplateLiteral(node)) {
      return node.text;
    }

    return undefined;
  }
  /** Internal helper method. */
  private getNamedNodeKey(node: Node): null | string {
    const nameNode = this.getNameNode(node);
    return nameNode === null ? null : this.getNameNodeText(nameNode);
  }
  /** Internal helper method. */
  private getNameNode(node: Node): Node | null {
    if (!("name" in node)) {
      return null;
    }

    const candidateNameNode = node.name;
    if (candidateNameNode === undefined || candidateNameNode === null) {
      return null;
    }

    return this.isNode(candidateNameNode) ? candidateNameNode : null;
  }
  /** Internal helper method. */
  private getNameNodeText(nameNode: Node): null | string {
    if (isIdentifier(nameNode)) {
      return nameNode.text;
    }

    if (isPrivateIdentifier(nameNode)) {
      return nameNode.text;
    }

    if (isStringLiteral(nameNode)) {
      return nameNode.text;
    }

    if (isNumericLiteral(nameNode)) {
      return nameNode.text;
    }

    return null;
  }
  /** Internal helper method. */
  private getNodeKey(node: Node): null | string {
    if (isImportDeclaration(node)) {
      return this.getImportKey(node);
    }

    if (isExportDeclaration(node)) {
      return this.getExportKey(node);
    }

    if (isDecorator(node)) {
      return this.getDecoratorKey(node);
    }

    if (isExpressionStatement(node)) {
      const expressionStatementKey = this.getExpressionStatementKey(
        node.expression,
      );
      if (expressionStatementKey !== null) {
        return expressionStatementKey;
      }
    }

    const literalKey = this.getLiteralKey(node);
    if (literalKey !== undefined) {
      return literalKey;
    }

    return this.getNamedNodeKey(node);
  }

  /** Internal helper method. */
  private isNode(value: unknown): value is Node {
    return (
      typeof value === "object" &&
      value !== null &&
      "kind" in value &&
      typeof value.kind === "number"
    );
  }
  /** Internal helper method. */
  private async pathExists(pathName: string): Promise<boolean> {
    try {
      await access(pathName);
      return true;
    } catch {
      return false;
    }
  }
  /** Internal helper method. */
  private resolveScriptKind(filename: string): ScriptKind {
    const extension = filename.slice(filename.lastIndexOf("."));

    switch (extension) {
      case ".cjs":
      case ".js":
      case ".mjs": {
        return ScriptKind.JS;
      }
      case ".jsx": {
        return ScriptKind.JSX;
      }
      case ".ts": {
        return ScriptKind.TS;
      }
      case ".tsx": {
        return ScriptKind.TSX;
      }
      default: {
        return ScriptKind.TS;
      }
    }
  }
  /** Internal helper method. */
  private validateComments(arguments_: ValidateCommentsArguments): string[] {
    const templateComments = this.extractAllComments(
      arguments_.templateSourceFile,
    );
    const instanceComments = this.extractAllComments(
      arguments_.instanceSourceFile,
    );
    const violations: string[] = [];
    let startIndex = 0;

    for (const templateComment of templateComments) {
      const relativeMatchIndex = instanceComments
        .slice(startIndex)
        .findIndex((instanceComment) => {
          if (TODO_LINE_REGEX.test(templateComment.text)) {
            return true;
          }

          return instanceComment.text === templateComment.text;
        });

      if (relativeMatchIndex === -1) {
        violations.push(`Missing comment "${templateComment.text}"`);
        continue;
      }

      startIndex += relativeMatchIndex + 1;
    }

    return violations;
  }
  /** Internal helper method. */
  private validateDepthFirstSearch(
    arguments_: ValidateDepthFirstSearchArguments,
  ): string[] {
    const instanceChildren = this.getChildren(arguments_.instanceNode);
    const templateChildren = this.getChildren(arguments_.templateNode);
    const violations: string[] = [];

    for (const templateChild of templateChildren) {
      violations.push(
        ...this.validateTemplateChild({
          instanceChildren,
          templateChild,
        }),
      );
    }

    return violations;
  }
  /** Internal helper method. */
  private async validatePathExistence(
    arguments_: ValidatePathExistenceArguments,
  ): Promise<string[]> {
    const issues: string[] = [];

    for (const filePath of arguments_.filePaths) {
      const resolvedPath = path.resolve(arguments_.workingDirectory, filePath);
      if (!(await this.pathExists(resolvedPath))) {
        issues.push(`Missing TypeScript path ${resolvedPath}`);
      }
    }

    return issues;
  }
  /** Internal helper method. */
  private validateTemplateChild(args: {
    readonly instanceChildren: Node[];
    readonly templateChild: Node;
  }): string[] {
    const templateNodeKey = this.getNodeKey(args.templateChild);

    if (templateNodeKey !== null) {
      const matchingKeyChild = this.findMatchingKeyChild({
        instanceChildren: args.instanceChildren,
        templateNodeKey,
      });

      if (matchingKeyChild === undefined) {
        const kindLabel = this.getKindLabel(args.templateChild);
        return [`Missing ${kindLabel} "${templateNodeKey}"`];
      }

      return this.validateDepthFirstSearch({
        instanceNode: matchingKeyChild,
        templateNode: args.templateChild,
      });
    }

    const sameKindChildren = args.instanceChildren.filter((instanceChild) => {
      return instanceChild.kind === args.templateChild.kind;
    });

    if (sameKindChildren.length === 0) {
      const kindLabel = this.getKindLabel(args.templateChild);
      return [`Missing ${kindLabel}`];
    }

    return this.findMinimumViolationCandidate({
      sameKindChildren,
      templateChild: args.templateChild,
    });
  }
  /** Internal helper method. */
  public async validate(
    arguments_: TypeScriptValidatorValidateArguments,
  ): Promise<TypeScriptValidatorValidateResult> {
    const {
      configurationPath,
      filePaths,
      templateRuleNames,
      workingDirectory,
    } = arguments_;

    if (configurationPath === undefined) {
      const pathViolations = await this.validatePathExistence({
        filePaths,
        workingDirectory,
      });

      return {
        checkedPaths: filePaths,
        ok: pathViolations.length === 0,
        pluginName: TYPESCRIPT_VALIDATOR_PLUGIN_DESCRIPTOR.name,
        violations: pathViolations,
      };
    }

    const payload = await prepareTemplateValidationPayload({
      configurationPath,
      fileExtensions: TYPESCRIPT_VALIDATOR_FILE_EXTENSIONS,
      filePaths,
      ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
      workingDirectory,
    });

    const issues: string[] = [];

    for (const document of payload.documents) {
      const scriptKind = this.resolveScriptKind(document.filename);
      const templateSourceFile = createSourceFile(
        document.filename,
        document.renderedTemplate,
        ScriptTarget.Latest,
        true,
        scriptKind,
      );
      const instanceSourceFile = createSourceFile(
        document.filename,
        document.instance,
        ScriptTarget.Latest,
        true,
        scriptKind,
      );

      const astViolations = this.validateDepthFirstSearch({
        instanceNode: instanceSourceFile,
        templateNode: templateSourceFile,
      });
      const commentViolations = this.validateComments({
        instanceSourceFile,
        templateSourceFile,
      });

      for (const violation of [...astViolations, ...commentViolations]) {
        issues.push(
          `${document.instanceFilePath}: ${violation} (template: ${document.templateFilePath})`,
        );
      }
    }

    issues.push(...payload.violations);

    return {
      checkedPaths: filePaths,
      ok: issues.length === 0,
      pluginName: TYPESCRIPT_VALIDATOR_PLUGIN_DESCRIPTOR.name,
      violations: issues,
    };
  }
}
