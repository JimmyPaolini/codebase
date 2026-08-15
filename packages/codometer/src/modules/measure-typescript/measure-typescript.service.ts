import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import {
  DOC_TAG_REGEX,
  EMPTY_TYPESCRIPT_RESULT,
  JS_EXTENSIONS,
  TODO_REGEX,
} from "./measure-typescript.constants";

import type {
  MeasureTypescriptInput,
  MeasureTypescriptResult,
} from "./measure-typescript.types";

/** Walks TypeScript and JavaScript ASTs to collect code metrics. */
@Injectable()
export class MeasureTypescriptService {
  // 🏗 Dependency Injection

  /** Creates the MeasureTypescriptService. */
  constructor() {}

  // 🔐 Private Fields

  private readonly kindDispatch: Partial<
    Record<
      number,
      (
        node: tsCompiler.Node,
        stats: MeasureTypescriptResult,
        insideClass: boolean,
      ) => void
    >
  > = {
    [tsCompiler.SyntaxKind.ArrowFunction]: (node, stats, insideClass) =>
      this.handleFunction(node, stats, insideClass),
    [tsCompiler.SyntaxKind.Decorator]: (_node, stats) => {
      stats.decorators++;
    },
    [tsCompiler.SyntaxKind.EnumDeclaration]: (node, stats) =>
      this.handleEnum(node, stats),
    [tsCompiler.SyntaxKind.FunctionDeclaration]: (node, stats, insideClass) =>
      this.handleFunction(node, stats, insideClass),
    [tsCompiler.SyntaxKind.FunctionExpression]: (node, stats, insideClass) =>
      this.handleFunction(node, stats, insideClass),
    [tsCompiler.SyntaxKind.GetAccessor]: (node, stats) =>
      this.handleMethodOrAccessor(node, stats),
    [tsCompiler.SyntaxKind.ImportDeclaration]: (node, stats) =>
      this.handleImport(node, stats),
    [tsCompiler.SyntaxKind.InterfaceDeclaration]: (node, stats) =>
      this.handleInterface(node, stats),
    [tsCompiler.SyntaxKind.MethodDeclaration]: (node, stats) =>
      this.handleMethodOrAccessor(node, stats),
    [tsCompiler.SyntaxKind.SetAccessor]: (node, stats) =>
      this.handleMethodOrAccessor(node, stats),
    [tsCompiler.SyntaxKind.TypeAliasDeclaration]: (node, stats) =>
      this.handleTypeAlias(node, stats),
    [tsCompiler.SyntaxKind.VariableStatement]: (node, stats) =>
      this.handleVariable(node, stats),
  };

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Count a discovered comment and update the appropriate metrics. */
  private countComment(
    commentText: string,
    stats: MeasureTypescriptResult,
  ): void {
    stats.comments++;
    const normalizedComment = commentText.replaceAll("\r\n", "\n");
    const lineCount = normalizedComment.split("\n").length;
    const commentLineCount = normalizedComment.includes("\n")
      ? Math.max(1, lineCount - 1)
      : 1;
    stats.commentLines += commentLineCount;

    if (commentText.startsWith("/**")) {
      stats.docComments++;
      for (const match of commentText.matchAll(DOC_TAG_REGEX)) {
        const tagName = match[1]?.toLowerCase() ?? "";
        stats.docTags[tagName] = (stats.docTags[tagName] ?? 0) + 1;
      }
      return;
    }

    if (commentText.startsWith("/*")) {
      stats.blockComments++;
      return;
    }

    stats.lineComments++;
  }

  /** Dispatches non-class AST nodes to the appropriate metric-collection handler. */
  private dispatchNode(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
    insideClass: boolean,
  ): void {
    this.kindDispatch[node.kind]?.(node, stats, insideClass);
  }

  /** Increments class, exported, and generic counts for a class node. */
  private handleClass(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
  ): void {
    stats.classes++;
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments enum and exported counts for an enum declaration node. */
  private handleEnum(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
  ): void {
    stats.enums++;
    if (this.hasExportKeyword(node)) stats.exported++;
  }

  /** Increments function, method, async, sync, exported, and generic counts for a function node. */
  private handleFunction(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
    insideClass: boolean,
  ): void {
    if (insideClass) {
      stats.methods++;
    } else {
      stats.functions++;
      if (this.hasExportKeyword(node)) stats.exported++;
    }
    if (this.hasAsyncKeyword(node)) {
      stats.asyncFunctions++;
    } else {
      stats.syncFunctions++;
    }
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments import count and tracks the external package name if applicable. */
  private handleImport(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
  ): void {
    stats.imports++;
    if (!tsCompiler.isImportDeclaration(node)) return;
    if (!tsCompiler.isStringLiteral(node.moduleSpecifier)) return;
    const specifier = node.moduleSpecifier.text;
    if (specifier && !specifier.startsWith(".") && !specifier.startsWith("/")) {
      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : (specifier.split("/")[0] ?? specifier);
      stats.externalPackages.add(packageName);
    }
  }

  /** Increments interface, exported, and generic counts for an interface declaration node. */
  private handleInterface(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
  ): void {
    stats.interfaces++;
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments method and async or sync counts for a method or accessor node. */
  private handleMethodOrAccessor(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
  ): void {
    stats.methods++;
    if (this.hasAsyncKeyword(node)) {
      stats.asyncFunctions++;
    } else {
      stats.syncFunctions++;
    }
  }

  /** Increments exported and generic counts for a type alias declaration node. */
  private handleTypeAlias(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
  ): void {
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  /** Increments constant and exported counts for a const variable statement. */
  private handleVariable(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
  ): void {
    if (!tsCompiler.isVariableStatement(node)) return;
    const isConst =
      (node.declarationList.flags & tsCompiler.NodeFlags.Const) !== 0;
    if (isConst) {
      const count = node.declarationList.declarations.length;
      stats.constants += count;
      if (this.hasExportKeyword(node)) stats.exported += count;
    }
  }

  /** Returns true when the node has an async modifier keyword. */
  private hasAsyncKeyword(node: tsCompiler.Node): boolean {
    const modifiers = tsCompiler.canHaveModifiers(node)
      ? tsCompiler.getModifiers(node)
      : undefined;
    return (
      modifiers?.some(
        (modifier) => modifier.kind === tsCompiler.SyntaxKind.AsyncKeyword,
      ) ?? false
    );
  }

  /** Returns true when the node has an export modifier keyword. */
  private hasExportKeyword(node: tsCompiler.Node): boolean {
    const modifiers = tsCompiler.canHaveModifiers(node)
      ? tsCompiler.getModifiers(node)
      : undefined;
    return (
      modifiers?.some(
        (modifier) => modifier.kind === tsCompiler.SyntaxKind.ExportKeyword,
      ) ?? false
    );
  }

  /** Returns true when the node declares one or more type parameters. */
  private hasTypeParameters(node: tsCompiler.Node): boolean {
    const nodeWithTypeParameters = node as tsCompiler.Node & {
      typeParameters?: unknown[];
    };
    return (
      "typeParameters" in node &&
      Array.isArray(nodeWithTypeParameters.typeParameters) &&
      nodeWithTypeParameters.typeParameters.length > 0
    );
  }

  /** Scan the provided source text and collect comment-based metrics. */
  private scanComments(content: string, stats: MeasureTypescriptResult): void {
    const scanner = tsCompiler.createScanner(
      tsCompiler.ScriptTarget.Latest,
      false,
      tsCompiler.LanguageVariant.Standard,
      content,
    );

    let token = scanner.scan();

    while (token !== tsCompiler.SyntaxKind.EndOfFileToken) {
      if (
        token === tsCompiler.SyntaxKind.SingleLineCommentTrivia ||
        token === tsCompiler.SyntaxKind.MultiLineCommentTrivia
      ) {
        this.countComment(scanner.getTokenText(), stats);
      }

      token = scanner.scan();
    }
  }

  /** Recursively visits each AST node and dispatches to the appropriate handler. */
  private walkNode(
    node: tsCompiler.Node,
    stats: MeasureTypescriptResult,
    insideClass: boolean,
  ): void {
    if (
      node.kind === tsCompiler.SyntaxKind.ClassDeclaration ||
      node.kind === tsCompiler.SyntaxKind.ClassExpression
    ) {
      this.handleClass(node, stats);
      tsCompiler.forEachChild(node, (child) =>
        this.walkNode(child, stats, true),
      );
      return;
    }
    this.dispatchNode(node, stats, insideClass);
    tsCompiler.forEachChild(node, (child) =>
      this.walkNode(child, stats, insideClass),
    );
  }

  // 🌎 Public Methods

  /** Analyzes TypeScript and JavaScript source files and returns aggregated AST metrics. */
  analyze(input: MeasureTypescriptInput): MeasureTypescriptResult {
    const { sourceFiles, workingDirectory } = input;

    const stats: MeasureTypescriptResult = {
      ...EMPTY_TYPESCRIPT_RESULT,
      docTags: { ...EMPTY_TYPESCRIPT_RESULT.docTags },
      externalPackages: new Set<string>(),
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ).length,
      testFiles: sourceFiles.filter((filePath) =>
        /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/.test(
          filePath,
        ),
      ).length,
      tsFiles: sourceFiles.filter(
        (filePath) => !JS_EXTENSIONS.has(path.extname(filePath)),
      ).length,
    };

    for (const filePath of sourceFiles) {
      const absolutePath = path.resolve(workingDirectory, filePath);
      const content = readFileSync(absolutePath, "utf8");
      const extension = path.extname(filePath);
      const isTsx = extension === ".tsx" || extension === ".jsx";
      const isJs = JS_EXTENSIONS.has(extension);
      const scriptKind = isTsx
        ? tsCompiler.ScriptKind.TSX
        : isJs
          ? tsCompiler.ScriptKind.JS
          : tsCompiler.ScriptKind.TS;

      const sourceFile = tsCompiler.createSourceFile(
        filePath,
        content,
        tsCompiler.ScriptTarget.Latest,
        true,
        scriptKind,
      );

      stats.lines += content.split(/\r?\n/).length;
      stats.todos += (content.match(TODO_REGEX) ?? []).length;
      this.scanComments(content, stats);

      this.walkNode(sourceFile, stats, false);
    }

    return stats;
  }
}
