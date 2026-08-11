import path from "node:path";

import {
  type Block,
  type CallExpression,
  createSourceFile,
  type ExportDeclaration,
  type ExpressionStatement,
  forEachChild,
  type ImportDeclaration,
  isBlock,
  isCallExpression,
  isClassDeclaration,
  isExportDeclaration,
  isExpressionStatement,
  isIdentifier,
  isImportDeclaration,
  isMethodDeclaration,
  isPropertyDeclaration,
  isPropertySignature,
  isReturnStatement,
  isTypeAliasDeclaration,
  isVariableDeclaration,
  type MethodDeclaration,
  type Node,
  type PropertySignature,
  type ReturnStatement,
  ScriptKind,
  ScriptTarget,
  type SourceFile,
  SyntaxKind,
  type VariableDeclaration,
} from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TypeScriptValidatorService } from "./typescript-validator.service";

const { prepareTemplateValidationPayloadMock } = vi.hoisted(() => {
  return {
    prepareTemplateValidationPayloadMock: vi.fn(),
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    prepareTemplateValidationPayload: prepareTemplateValidationPayloadMock,
  };
});

interface TypeScriptValidatorServiceInternals {
  buildDecoratorName(callee: Node): null | string;
  extractAllComments(sourceFile: SourceFile): {
    readonly position: number;
    readonly text: string;
  }[];
  findMatchingKeyChild(args: {
    readonly instanceChildren: Node[];
    readonly templateNodeKey: string;
  }): Node | undefined;
  findMinimumViolationCandidate(args: {
    readonly sameKindChildren: Node[];
    readonly templateChild: Node;
  }): string[];
  getChildren(node: Node): Node[];
  getDecoratorKey(node: Node): null | string;
  getExportKey(node: Node): null | string;
  getExpressionStatementKey(expression: Node): null | string;
  getImportKey(node: Node): null | string;
  getKindLabel(node: Node): string;
  getLiteralKey(node: Node): string | undefined;
  getNamedNodeKey(node: Node): null | string;
  getNameNode(node: Node): Node | null;
  getNameNodeText(nameNode: Node): null | string;
  getNodeKey(node: Node): null | string;
  isNode(value: unknown): value is Node;
  pathExists(pathName: string): Promise<boolean>;
  resolveScriptKind(filename: string): ScriptKind;
  validateComments(args: {
    readonly instanceSourceFile: SourceFile;
    readonly templateSourceFile: SourceFile;
  }): string[];
  validateDepthFirstSearch(args: {
    readonly instanceNode: Node;
    readonly templateNode: Node;
  }): string[];
  validatePathExistence(args: {
    readonly filePaths: string[];
    readonly workingDirectory: string;
  }): Promise<string[]>;
  validateTemplateChild(args: {
    readonly instanceChildren: Node[];
    readonly templateChild: Node;
  }): string[];
}

const createTypeScriptSourceFile = (
  sourceText: string,
  filename = "source.ts",
): SourceFile => {
  return createSourceFile(
    filename,
    sourceText,
    ScriptTarget.Latest,
    true,
    ScriptKind.TS,
  );
};

const createSourceFileNodeList = (sourceFile: SourceFile): Node[] => {
  const nodes: Node[] = [];

  const visitNode = (node: Node): void => {
    nodes.push(node);
    forEachChild(node, visitNode);
  };

  visitNode(sourceFile);
  return nodes;
};

const findNode = <NodeType extends Node>(
  sourceFile: SourceFile,
  predicate: (node: Node) => node is NodeType,
): NodeType => {
  for (const node of createSourceFileNodeList(sourceFile)) {
    if (predicate(node)) {
      return node;
    }
  }

  throw new Error("Unable to find node for predicate.");
};

describe(TypeScriptValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  it("reports import specifier AST deviations when identifiers are changed", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.ts",
          instance:
            'import { beta } from "./dependency";\nexport const selected = beta;\n',
          instanceFilePath: "src/example.ts",
          renderedTemplate:
            'import { alpha } from "./dependency";\nexport const selected = alpha;\n',
          templateFilePath: "templates/example.ts",
        },
      ],
      violations: [],
    });

    const typeScriptValidatorService = new TypeScriptValidatorService();

    const result = await typeScriptValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.ts"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.ts: Missing ImportSpecifier "alpha" (template: templates/example.ts)',
    );
  });

  it("reports schema-preserving but AST-different initializer shapes", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "example.ts",
          instance: "const selected = (sourceValue);\n",
          instanceFilePath: "src/example.ts",
          renderedTemplate: "const selected = sourceValue;\n",
          templateFilePath: "templates/example.ts",
        },
      ],
      violations: [],
    });

    const typeScriptValidatorService = new TypeScriptValidatorService();

    const result = await typeScriptValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.ts"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/example.ts: Missing Identifier "sourceValue" (template: templates/example.ts)',
    );
  });

  it("returns missing-path violations when configurationPath is undefined", async () => {
    const typeScriptValidatorService = new TypeScriptValidatorService();

    const result = await typeScriptValidatorService.validate({
      filePaths: [
        "src/modules/typescript-validator/typescript-validator.service.ts",
      ],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
  });

  it("reports a missing file when configurationPath is undefined", async () => {
    const typeScriptValidatorService = new TypeScriptValidatorService();

    const result = await typeScriptValidatorService.validate({
      filePaths: ["src/modules/typescript-validator/definitely-missing.ts"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations[0]).toContain("Missing TypeScript path");
  });

  it("passes through payload-level violations from configuration validation", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [],
      violations: ["payload-level issue"],
    });

    const typeScriptValidatorService = new TypeScriptValidatorService();

    const result = await typeScriptValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/example.ts"],
      templateRuleNames: ["react-component"],
      workingDirectory: process.cwd(),
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      fileExtensions: [".ts", ".tsx"],
      filePaths: ["src/example.ts"],
      templateRuleNames: ["react-component"],
      workingDirectory: process.cwd(),
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain("payload-level issue");
  });

  it("exercises script kind and key extraction across supported syntaxes", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "module.js",
          instance:
            'import { shared } from "./lib.js";\nexport { shared } from "./instance.js";\n@decorators.trace("instance")\nclass Example {}\nsetup("instance");\n',
          instanceFilePath: "src/module.js",
          renderedTemplate:
            'import { shared } from "./lib.js";\nexport { shared } from "./template.js";\n@decorators.trace("template")\nclass Example {}\nsetup("template");\n',
          templateFilePath: "templates/module.js",
        },
        {
          filename: "component.jsx",
          instance: "const value = (input);\n",
          instanceFilePath: "src/component.jsx",
          renderedTemplate: "const value = input;\n",
          templateFilePath: "templates/component.jsx",
        },
        {
          filename: "page.tsx",
          instance: "const value = 1n;\n",
          instanceFilePath: "src/page.tsx",
          renderedTemplate: "const value = 2n;\n",
          templateFilePath: "templates/page.tsx",
        },
        {
          filename: "file.cjs",
          instance: "const value = 1;\n",
          instanceFilePath: "src/file.cjs",
          renderedTemplate: "const value = 2;\n",
          templateFilePath: "templates/file.cjs",
        },
        {
          filename: "file.mjs",
          instance: "const value = `instance`;\n",
          instanceFilePath: "src/file.mjs",
          renderedTemplate: "const value = `template`;\n",
          templateFilePath: "templates/file.mjs",
        },
      ],
      violations: [],
    });

    const typeScriptValidatorService = new TypeScriptValidatorService();
    const result = await typeScriptValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/module.js"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toStrictEqual(
      expect.arrayContaining([
        'src/module.js: Missing ExportDeclaration "./template.js" (template: templates/module.js)',
        'src/module.js: Missing StringLiteral "template" (template: templates/module.js)',
        'src/module.js: Missing ExpressionStatement "setup:template" (template: templates/module.js)',
      ]),
    );
  });

  it("exposes private helper branches through internal service calls", async () => {
    const typeScriptValidatorService = new TypeScriptValidatorService();
    const internalService: TypeScriptValidatorServiceInternals =
      Object.getPrototypeOf(typeScriptValidatorService);

    const callableSourceFile = createTypeScriptSourceFile(
      "factory.alpha.beta(); this.gamma();",
    );
    const propertyCallExpression = findNode(
      callableSourceFile,
      (node): node is CallExpression => {
        return (
          isCallExpression(node) &&
          node.expression.kind === SyntaxKind.PropertyAccessExpression &&
          node.expression.getText(callableSourceFile) === "factory.alpha.beta"
        );
      },
    );
    const thisCallExpression = findNode(
      callableSourceFile,
      (node): node is CallExpression => {
        return (
          isCallExpression(node) &&
          node.expression.kind === SyntaxKind.PropertyAccessExpression &&
          node.expression.getText(callableSourceFile) === "this.gamma"
        );
      },
    );

    expect(
      internalService.buildDecoratorName(propertyCallExpression.expression),
    ).toBe("factory.alpha.beta");
    expect(
      internalService.buildDecoratorName(thisCallExpression.expression),
    ).toBeNull();

    const exportSourceFile = createTypeScriptSourceFile(
      'export { alpha } from "./external";\nexport { beta };',
    );
    const exportDeclarationWithModuleSpecifier = findNode(
      exportSourceFile,
      (node): node is ExportDeclaration => {
        return isExportDeclaration(node) && node.moduleSpecifier !== undefined;
      },
    );
    const exportDeclarationWithoutModuleSpecifier = findNode(
      exportSourceFile,
      (node): node is ExportDeclaration => {
        return isExportDeclaration(node) && node.moduleSpecifier === undefined;
      },
    );

    expect(
      internalService.getExportKey(exportDeclarationWithModuleSpecifier),
    ).toBe("./external");
    expect(
      internalService.getExportKey(exportDeclarationWithoutModuleSpecifier),
    ).toBeNull();

    const expressionSourceFile = createTypeScriptSourceFile(
      '"use strict";\nsetup();\nsetup("feature");\nsetup({ enabled: true });',
    );
    const expressionStatementWithLiteral = findNode(
      expressionSourceFile,
      (node): node is ExpressionStatement => {
        return (
          isExpressionStatement(node) &&
          node.getText(expressionSourceFile) === '"use strict";'
        );
      },
    );
    const expressionStatementWithoutArguments = findNode(
      expressionSourceFile,
      (node): node is ExpressionStatement => {
        return (
          isExpressionStatement(node) &&
          node.getText(expressionSourceFile) === "setup();"
        );
      },
    );
    const expressionStatementWithLiteralArgument = findNode(
      expressionSourceFile,
      (node): node is ExpressionStatement => {
        return (
          isExpressionStatement(node) &&
          node.getText(expressionSourceFile) === 'setup("feature");'
        );
      },
    );
    const expressionStatementWithObjectArgument = findNode(
      expressionSourceFile,
      (node): node is ExpressionStatement => {
        return (
          isExpressionStatement(node) &&
          node.getText(expressionSourceFile) === "setup({ enabled: true });"
        );
      },
    );

    expect(
      internalService.getExpressionStatementKey(
        expressionStatementWithLiteral.expression,
      ),
    ).toBeNull();
    expect(
      internalService.getExpressionStatementKey(
        expressionStatementWithoutArguments.expression,
      ),
    ).toBe("setup");
    expect(
      internalService.getExpressionStatementKey(
        expressionStatementWithLiteralArgument.expression,
      ),
    ).toBe("setup:feature");
    expect(
      internalService.getExpressionStatementKey(
        expressionStatementWithObjectArgument.expression,
      ),
    ).toBe("setup");

    const nonIdentifierCallSourceFile =
      createTypeScriptSourceFile("this.execute();");
    const thisExpressionStatement = findNode(
      nonIdentifierCallSourceFile,
      isExpressionStatement,
    );

    expect(
      internalService.getExpressionStatementKey(
        thisExpressionStatement.expression,
      ),
    ).toBeNull();

    const literalSourceFile = createTypeScriptSourceFile(
      "const named = 1; const big = 1n; const template = `value`;",
    );
    const namedVariableDeclaration = findNode(
      literalSourceFile,
      (node): node is VariableDeclaration => {
        return (
          isVariableDeclaration(node) &&
          isIdentifier(node.name) &&
          node.name.text === "named"
        );
      },
    );
    const bigVariableDeclaration = findNode(
      literalSourceFile,
      (node): node is VariableDeclaration => {
        return (
          isVariableDeclaration(node) &&
          isIdentifier(node.name) &&
          node.name.text === "big"
        );
      },
    );
    const templateVariableDeclaration = findNode(
      literalSourceFile,
      (node): node is VariableDeclaration => {
        return (
          isVariableDeclaration(node) &&
          isIdentifier(node.name) &&
          node.name.text === "template"
        );
      },
    );

    if (
      namedVariableDeclaration.initializer === undefined ||
      bigVariableDeclaration.initializer === undefined ||
      templateVariableDeclaration.initializer === undefined
    ) {
      throw new Error(
        "Expected variable declarations to include initializers.",
      );
    }

    expect(internalService.getLiteralKey(namedVariableDeclaration.name)).toBe(
      "named",
    );
    expect(
      internalService.getLiteralKey(namedVariableDeclaration.initializer),
    ).toBe("1");
    expect(
      internalService.getLiteralKey(bigVariableDeclaration.initializer),
    ).toBe("1n");
    expect(
      internalService.getLiteralKey(templateVariableDeclaration.initializer),
    ).toBe("value");
    expect(internalService.getLiteralKey(callableSourceFile)).toBeUndefined();

    const declarationSourceFile = createTypeScriptSourceFile(
      'type Alias = string;\ninterface Props { "quoted": number; 123: number; }\nclass Example { #secret = 1; "named"() {} 123() {} }\n',
    );
    const typeAliasDeclaration = findNode(
      declarationSourceFile,
      isTypeAliasDeclaration,
    );
    const quotedPropertySignature = findNode(
      declarationSourceFile,
      (node): node is PropertySignature => {
        return (
          isPropertySignature(node) &&
          node.name.getText(declarationSourceFile) === '"quoted"'
        );
      },
    );
    const numericPropertySignature = findNode(
      declarationSourceFile,
      (node): node is PropertySignature => {
        return (
          isPropertySignature(node) &&
          node.name.getText(declarationSourceFile) === "123"
        );
      },
    );
    const classDeclaration = findNode(
      declarationSourceFile,
      isClassDeclaration,
    );
    const privatePropertyDeclaration = findNode(
      declarationSourceFile,
      isPropertyDeclaration,
    );
    const stringNamedClassMethod = findNode(
      declarationSourceFile,
      (node): node is MethodDeclaration => {
        return (
          isMethodDeclaration(node) &&
          node.name.getText(declarationSourceFile) === '"named"'
        );
      },
    );
    const numericNamedClassMethod = findNode(
      declarationSourceFile,
      (node): node is MethodDeclaration => {
        return (
          isMethodDeclaration(node) &&
          node.name.getText(declarationSourceFile) === "123"
        );
      },
    );

    expect(internalService.getNamedNodeKey(typeAliasDeclaration)).toBe("Alias");
    expect(internalService.getNamedNodeKey(declarationSourceFile)).toBeNull();
    expect(internalService.getNameNode(typeAliasDeclaration)).not.toBeNull();
    expect(internalService.getNameNode(declarationSourceFile)).toBeNull();
    expect(internalService.getNameNodeText(typeAliasDeclaration.name)).toBe(
      "Alias",
    );
    expect(internalService.getNameNodeText(quotedPropertySignature.name)).toBe(
      "quoted",
    );
    expect(internalService.getNameNodeText(numericPropertySignature.name)).toBe(
      "123",
    );
    expect(
      internalService.getNameNodeText(privatePropertyDeclaration.name),
    ).toBe("#secret");
    expect(internalService.getNameNodeText(stringNamedClassMethod.name)).toBe(
      "named",
    );
    expect(internalService.getNameNodeText(numericNamedClassMethod.name)).toBe(
      "123",
    );
    expect(internalService.getNameNodeText(classDeclaration)).toBeNull();

    expect(internalService.getNodeKey(typeAliasDeclaration)).toBe("Alias");
    expect(internalService.getNodeKey(classDeclaration)).toBe("Example");
    expect(internalService.isNode(typeAliasDeclaration)).toBe(true);
    expect(internalService.isNode(null)).toBe(false);
    expect(internalService.isNode({})).toBe(false);
    expect(internalService.isNode({ kind: "wrong" })).toBe(false);

    expect(internalService.resolveScriptKind("example.js")).toBe(ScriptKind.JS);
    expect(internalService.resolveScriptKind("example.cjs")).toBe(
      ScriptKind.JS,
    );
    expect(internalService.resolveScriptKind("example.mjs")).toBe(
      ScriptKind.JS,
    );
    expect(internalService.resolveScriptKind("example.jsx")).toBe(
      ScriptKind.JSX,
    );
    expect(internalService.resolveScriptKind("example.ts")).toBe(ScriptKind.TS);
    expect(internalService.resolveScriptKind("example.tsx")).toBe(
      ScriptKind.TSX,
    );
    expect(internalService.resolveScriptKind("example.unknown")).toBe(
      ScriptKind.TS,
    );

    const templateCommentFile = createTypeScriptSourceFile(
      "// Keep this comment\n// TODO dynamic\nconst value = 1;\n",
    );
    const instanceCommentFile = createTypeScriptSourceFile(
      "// Keep this comment\n// Any replacement is fine\nconst value = 1;\n",
    );

    expect(
      internalService.validateComments({
        instanceSourceFile: instanceCommentFile,
        templateSourceFile: templateCommentFile,
      }),
    ).toStrictEqual([]);

    const missingCommentInstance =
      createTypeScriptSourceFile("const value = 1;\n");

    expect(
      internalService.validateComments({
        instanceSourceFile: missingCommentInstance,
        templateSourceFile: templateCommentFile,
      }),
    ).toContain('Missing comment "// Keep this comment"');

    const templateFunction = createTypeScriptSourceFile(
      "function selected() { return 1; }\n",
    );
    const instanceFunction = createTypeScriptSourceFile(
      "function selected() { const value = 1; }\n",
    );
    const returnStatement = findNode(
      templateFunction,
      (node): node is ReturnStatement => {
        return isReturnStatement(node);
      },
    );

    expect(
      internalService.validateTemplateChild({
        instanceChildren: internalService.getChildren(
          findNode(instanceFunction, (node): node is Block => {
            return isBlock(node);
          }),
        ),
        templateChild: returnStatement,
      }),
    ).toContain("Missing ReturnStatement");

    const firstSourceFile = createTypeScriptSourceFile("const first = 1;");
    const secondSourceFile = createTypeScriptSourceFile("const second = 1;");
    const templateChild = findNode(firstSourceFile, isVariableDeclaration);
    const sameKindChildren = [
      findNode(firstSourceFile, isVariableDeclaration),
      findNode(secondSourceFile, isVariableDeclaration),
    ];
    const validateDepthFirstSearchSpy = vi
      .spyOn(internalService, "validateDepthFirstSearch")
      .mockReturnValueOnce(["first", "second"])
      .mockReturnValueOnce(["shorter"]);

    expect(
      internalService.findMinimumViolationCandidate({
        sameKindChildren,
        templateChild,
      }),
    ).toStrictEqual(["shorter"]);

    validateDepthFirstSearchSpy.mockRestore();
    const validateDepthFirstSearchWithoutShorterCandidateSpy = vi
      .spyOn(internalService, "validateDepthFirstSearch")
      .mockReturnValueOnce(["shorter"])
      .mockReturnValueOnce(["first", "second"]);

    expect(
      internalService.findMinimumViolationCandidate({
        sameKindChildren,
        templateChild,
      }),
    ).toStrictEqual(["shorter"]);

    validateDepthFirstSearchWithoutShorterCandidateSpy.mockRestore();

    expect(
      internalService.getChildren(templateCommentFile).length,
    ).toBeGreaterThan(0);
    expect(
      internalService.findMatchingKeyChild({
        instanceChildren: internalService.getChildren(instanceCommentFile),
        templateNodeKey: "missing-key",
      }),
    ).toBeUndefined();

    const importSourceFile = createTypeScriptSourceFile(
      'import { item } from "./module";',
    );
    const importDeclaration = findNode(
      importSourceFile,
      (node): node is ImportDeclaration => {
        return isImportDeclaration(node);
      },
    );

    expect(internalService.getImportKey(importDeclaration)).toBe("./module");
    expect(internalService.getKindLabel(importDeclaration)).toBe(
      "ImportDeclaration",
    );

    const expressionStatementNode = findNode(
      expressionSourceFile,
      isExpressionStatement,
    );

    expect(internalService.getNodeKey(expressionStatementNode)).toBeNull();
    expect(internalService.getDecoratorKey(returnStatement)).toBeNull();

    const existingPath = path.resolve(
      process.cwd(),
      "src/modules/typescript-validator/typescript-validator.service.ts",
    );
    const missingPath = path.resolve(
      process.cwd(),
      "src/modules/typescript-validator/path-that-does-not-exist.ts",
    );

    await expect(internalService.pathExists(existingPath)).resolves.toBe(true);
    await expect(internalService.pathExists(missingPath)).resolves.toBe(false);
    await expect(
      internalService.validatePathExistence({
        filePaths: [
          "src/modules/typescript-validator/typescript-validator.service.ts",
          "src/modules/typescript-validator/path-that-does-not-exist.ts",
        ],
        workingDirectory: process.cwd(),
      }),
    ).resolves.toHaveLength(1);
    expect(
      internalService.validateDepthFirstSearch({
        instanceNode: instanceCommentFile,
        templateNode: templateCommentFile,
      }),
    ).toBeInstanceOf(Array);
  });
});
