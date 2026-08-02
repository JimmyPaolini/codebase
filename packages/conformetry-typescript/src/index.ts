import { access } from "node:fs/promises";
import path from "node:path";

import {
  type ConformetryValidatorPlugin,
  prepareTemplateValidationPayload,
} from "@jimmypaolini/conformetry-validation";
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

/**
 *
 */
interface ExtractedComment {
  position: number;
  text: string;
}

const TODO_LINE_REGEX = /\bTODO\b/u;

/**
 * Creates a validator plugin for TypeScript files.
 */
export function createTypeScriptValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks TypeScript AST structure and required comments",
      fileExtensions: [".ts", ".tsx"],
      name: "typescript",
    },
    validate: async ({
      configurationPath,
      filePaths,
      templateRuleNames,
      workingDirectory,
    }) => {
      if (configurationPath === undefined) {
        const pathViolations = await validatePathExistence({
          filePaths,
          workingDirectory,
        });

        return {
          checkedPaths: filePaths,
          ok: pathViolations.length === 0,
          pluginName: "typescript",
          violations: pathViolations,
        };
      }

      const payload = await prepareTemplateValidationPayload({
        configurationPath,
        fileExtensions: [".ts", ".tsx"],
        filePaths,
        ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
        workingDirectory,
      });
      const issues: string[] = [];

      for (const document of payload.documents) {
        const scriptKind = resolveScriptKind(document.filename);
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

        const astViolations = validateDepthFirstSearch({
          instanceNode: instanceSourceFile,
          templateNode: templateSourceFile,
        });
        const commentViolations = validateComments({
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
        pluginName: "typescript",
        violations: issues,
      };
    },
  };
}

/**
 * Builds a dotted decorator name from an expression.
 */
function buildDecoratorName(callee: Node): null | string {
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

/**
 * Extracts comments from a source file in source order.
 */
function extractAllComments(sourceFile: SourceFile): ExtractedComment[] {
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

/**
 * Returns semantic child nodes, excluding EndOfFileToken.
 */
function getChildren(node: Node): Node[] {
  const children: Node[] = [];

  forEachChild(node, (childNode) => {
    if (childNode.kind !== SyntaxKind.EndOfFileToken) {
      children.push(childNode);
    }
  });

  return children;
}

/**
 * Returns a decorator identity key.
 */
function getDecoratorKey(node: Decorator): null | string {
  const callee = isCallExpression(node.expression)
    ? node.expression.expression
    : node.expression;

  return buildDecoratorName(callee);
}

/**
 * Returns an export declaration key.
 */
function getExportKey(node: ExportDeclaration): null | string {
  const { moduleSpecifier } = node;
  if (moduleSpecifier === undefined) {
    return null;
  }

  return isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : null;
}

/**
 * Returns a key for expression statements that call named functions.
 */
function getExpressionStatementKey(expression: Expression): null | string {
  if (!isCallExpression(expression)) {
    return null;
  }

  const calleeName = buildDecoratorName(expression.expression);
  if (calleeName === null) {
    return null;
  }

  const firstArgument = expression.arguments[0];
  if (firstArgument === undefined) {
    return calleeName;
  }

  const firstArgumentKey = getLiteralKey(firstArgument);
  return firstArgumentKey === undefined
    ? calleeName
    : `${calleeName}:${firstArgumentKey}`;
}

/**
 * Returns an import declaration key.
 */
function getImportKey(node: ImportDeclaration): null | string {
  const { moduleSpecifier } = node;
  return isStringLiteral(moduleSpecifier) ? moduleSpecifier.text : null;
}

/**
 * Returns a literal identity key.
 */
function getLiteralKey(node: Node): string | undefined {
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

/**
 * Returns a name-based identity key for named nodes.
 */
function getNamedNodeKey(node: Node): null | string {
  if (!("name" in node)) {
    return null;
  }

  const candidateNameNode = node.name;
  if (candidateNameNode === undefined || candidateNameNode === null) {
    return null;
  }

  if (typeof candidateNameNode !== "object") {
    return null;
  }

  const nameNode = candidateNameNode as Node;

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

/**
 * Returns a stable identity key for keyed AST nodes, or null.
 */
function getNodeKey(node: Node): null | string {
  if (isImportDeclaration(node)) {
    return getImportKey(node);
  }

  if (isExportDeclaration(node)) {
    return getExportKey(node);
  }

  if (isDecorator(node)) {
    return getDecoratorKey(node);
  }

  if (isExpressionStatement(node)) {
    const expressionStatementKey = getExpressionStatementKey(node.expression);
    if (expressionStatementKey !== null) {
      return expressionStatementKey;
    }
  }

  const literalKey = getLiteralKey(node);
  if (literalKey !== undefined) {
    return literalKey;
  }

  return getNamedNodeKey(node);
}

/**
 * Resolves whether a file path exists.
 */
async function pathExists(pathName: string): Promise<boolean> {
  try {
    await access(pathName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves ScriptKind from file extension.
 */
function resolveScriptKind(filename: string): ScriptKind {
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

/**
 * Validates template comments appear in instance comments in order.
 */
function validateComments(args: {
  instanceSourceFile: SourceFile;
  templateSourceFile: SourceFile;
}): string[] {
  const templateComments = extractAllComments(args.templateSourceFile);
  const instanceComments = extractAllComments(args.instanceSourceFile);
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
      violations.push(`Missing comment \"${templateComment.text}\"`);
      continue;
    }

    startIndex += relativeMatchIndex + 1;
  }

  return violations;
}

/**
 * Validates template AST nodes against an instance AST.
 */
function validateDepthFirstSearch(args: {
  instanceNode: Node;
  templateNode: Node;
}): string[] {
  const instanceChildren = getChildren(args.instanceNode);
  const templateChildren = getChildren(args.templateNode);
  const violations: string[] = [];

  for (const templateChild of templateChildren) {
    const templateNodeKey = getNodeKey(templateChild);
    if (templateNodeKey !== null) {
      const matchingKeyChild = instanceChildren.find((instanceChild) => {
        return getNodeKey(instanceChild) === templateNodeKey;
      });

      if (matchingKeyChild === undefined) {
        const kindLabel = SyntaxKind[templateChild.kind] ?? "UnknownSyntaxNode";
        violations.push(`Missing ${kindLabel} \"${templateNodeKey}\"`);
        continue;
      }

      violations.push(
        ...validateDepthFirstSearch({
          instanceNode: matchingKeyChild,
          templateNode: templateChild,
        }),
      );
      continue;
    }

    const sameKindChildren = instanceChildren.filter(
      (instanceChild) => instanceChild.kind === templateChild.kind,
    );

    if (sameKindChildren.length === 0) {
      const kindLabel = SyntaxKind[templateChild.kind] ?? "UnknownSyntaxNode";
      violations.push(`Missing ${kindLabel}`);
      continue;
    }

    const nestedViolationsByCandidate = sameKindChildren.map(
      (sameKindChild) => {
        return validateDepthFirstSearch({
          instanceNode: sameKindChild,
          templateNode: templateChild,
        });
      },
    );

    const minimumViolationCandidate = nestedViolationsByCandidate.reduce(
      (minimumViolations, candidateViolations) => {
        return candidateViolations.length < minimumViolations.length
          ? candidateViolations
          : minimumViolations;
      },
    );

    violations.push(...minimumViolationCandidate);
  }

  return violations;
}

/**
 * Validates that each provided path exists.
 */
async function validatePathExistence(args: {
  filePaths: string[];
  workingDirectory: string;
}): Promise<string[]> {
  const issues: string[] = [];

  for (const filePath of args.filePaths) {
    const resolvedPath = path.resolve(args.workingDirectory, filePath);
    if (!(await pathExists(resolvedPath))) {
      issues.push(`Missing TypeScript path ${resolvedPath}`);
    }
  }

  return issues;
}
