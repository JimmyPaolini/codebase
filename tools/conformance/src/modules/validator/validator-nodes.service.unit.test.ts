import { Test } from "@nestjs/testing";
import {
  createSourceFile,
  factory,
  isClassDeclaration,
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
} from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidatorNodesService } from "./validator-nodes.service";

describe(ValidatorNodesService, () => {
  let service: ValidatorNodesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorNodesService],
    }).compile();

    service = await module.resolve(ValidatorNodesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns stable keys for imports, exports, decorators, literals, and named nodes", () => {
    const sourceFile = createSourceFile(
      "sample.ts",
      [
        'import sampleImport from "sample";',
        'export { sampleExport } from "sample";',
        'sampleCall("alpha");',
        "class SampleClass {",
        "  #privateField;",
        '  "stringField" = 1;',
        "  42 = 2;",
        "  publicField = 3;",
        "}",
      ].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const importDeclaration = sourceFile.statements[0];
    const exportDeclaration = sourceFile.statements[1];
    const expressionStatement = sourceFile.statements[2];
    if (
      importDeclaration === undefined ||
      exportDeclaration === undefined ||
      expressionStatement === undefined
    ) {
      throw new Error("Expected import/export/expression statements");
    }
    const classDeclaration = sourceFile.statements[3];
    if (classDeclaration === undefined) {
      throw new Error("Expected class declaration");
    }
    const classMembers = isClassDeclaration(classDeclaration)
      ? classDeclaration.members
      : [];
    const [privateField, stringField, numericField, publicField] = classMembers;

    if (
      privateField === undefined ||
      stringField === undefined ||
      numericField === undefined ||
      publicField === undefined
    ) {
      throw new Error("Expected four class members");
    }

    expect(service.getKey(importDeclaration)).toBe("sample");
    expect(service.getKey(exportDeclaration)).toBe("sample");
    expect(service.getKey(expressionStatement)).toBe("sampleCall:alpha");
    expect(
      service.getKey(
        factory.createDecorator(factory.createIdentifier("sealed")),
      ),
    ).toBe("sealed");

    expect(service.getKey(factory.createIdentifier("identifier"))).toBe(
      "identifier",
    );
    expect(service.getKey(factory.createStringLiteral("string"))).toBe(
      "string",
    );
    expect(service.getKey(factory.createNumericLiteral("42"))).toBe("42");
    expect(service.getKey(factory.createBigIntLiteral("42n"))).toBe("42n");

    expect(service.getKey(privateField)).toBe("#privateField");
    expect(service.getKey(stringField)).toBe("stringField");
    expect(service.getKey(numericField)).toBe("42");
    expect(service.getKey(publicField)).toBe("publicField");
  });

  it("returns keys for property-access decorators and expression statement fallbacks", () => {
    expect(
      service.getKey(
        factory.createDecorator(
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier("ns"),
              "sealed",
            ),
            undefined,
            [],
          ),
        ),
      ),
    ).toBe("ns.sealed");

    expect(
      service.getKey(
        factory.createExpressionStatement(
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier("sampleCall"),
              "run",
            ),
            undefined,
            [],
          ),
        ),
      ),
    ).toBe("sampleCall.run");

    expect(
      service.getKey(
        factory.createExpressionStatement(
          factory.createCallExpression(
            factory.createIdentifier("sampleCall"),
            undefined,
            [
              factory.createPropertyAccessExpression(
                factory.createIdentifier("value"),
                "name",
              ),
            ],
          ),
        ),
      ),
    ).toBe("sampleCall");
  });

  it("returns null for nodes without a semantic key", () => {
    expect(service.getKey(factory.createObjectLiteralExpression())).toBeNull();
  });

  it("returns null for decorators and call expressions that cannot resolve a name", () => {
    const computedDecorator = factory.createDecorator(
      factory.createCallExpression(
        factory.createElementAccessExpression(
          factory.createIdentifier("namespaceValue"),
          factory.createStringLiteral("sealed"),
        ),
        undefined,
        [],
      ),
    );
    const computedCallExpression = factory.createExpressionStatement(
      factory.createCallExpression(
        factory.createElementAccessExpression(
          factory.createIdentifier("namespaceValue"),
          factory.createStringLiteral("run"),
        ),
        undefined,
        [factory.createStringLiteral("alpha")],
      ),
    );

    expect(service.getKey(computedDecorator)).toBeNull();
    expect(service.getKey(computedCallExpression)).toBeNull();
  });

  it("returns a call key with numeric and bigint literal first arguments", () => {
    const numericCallExpression = factory.createExpressionStatement(
      factory.createCallExpression(
        factory.createIdentifier("sampleCall"),
        undefined,
        [factory.createNumericLiteral("42")],
      ),
    );
    const bigIntCallExpression = factory.createExpressionStatement(
      factory.createCallExpression(
        factory.createIdentifier("sampleCall"),
        undefined,
        [factory.createBigIntLiteral("42n")],
      ),
    );

    expect(service.getKey(numericCallExpression)).toBe("sampleCall:42");
    expect(service.getKey(bigIntCallExpression)).toBe("sampleCall:42n");
  });

  it("returns null for non-string export/import module specifiers", () => {
    const exportDeclaration = factory.createExportDeclaration(
      undefined,
      false,
      factory.createNamedExports([]),
      factory.createNoSubstitutionTemplateLiteral("module-name"),
    );
    const importDeclaration = factory.createImportDeclaration(
      undefined,
      undefined,
      factory.createNoSubstitutionTemplateLiteral("module-name"),
      undefined,
    );

    expect(service.getKey(exportDeclaration)).toBeNull();
    expect(service.getKey(importDeclaration)).toBeNull();
  });

  it("returns null for export declarations without module specifier", () => {
    const exportDeclaration = factory.createExportDeclaration(
      undefined,
      false,
      factory.createNamedExports([]),
      undefined,
    );

    expect(service.getKey(exportDeclaration)).toBeNull();
  });

  it("returns call key without first-argument suffix when argument is non-literal", () => {
    const expressionStatement = factory.createExpressionStatement(
      factory.createCallExpression(
        factory.createIdentifier("sampleCall"),
        undefined,
        [factory.createObjectLiteralExpression()],
      ),
    );

    expect(service.getKey(expressionStatement)).toBe("sampleCall");
  });

  it("returns null for expression statements that are not call expressions", () => {
    const expressionStatement = factory.createExpressionStatement(
      factory.createBinaryExpression(
        factory.createIdentifier("left"),
        factory.createToken(SyntaxKind.PlusToken),
        factory.createIdentifier("right"),
      ),
    );

    expect(service.getKey(expressionStatement)).toBeNull();
  });

  it("returns literal keys for no-substitution template literals", () => {
    expect(
      service.getKey(factory.createNoSubstitutionTemplateLiteral("template")),
    ).toBe("template");
  });

  it("returns numeric named-node keys", () => {
    const sourceFile = createSourceFile(
      "numeric-name.ts",
      ["class NumericKey {", "  7 = value;", "}"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const classDeclaration = sourceFile.statements[0];
    if (classDeclaration === undefined) {
      throw new Error("Expected class declaration");
    }
    const classMembers = isClassDeclaration(classDeclaration)
      ? classDeclaration.members
      : [];
    const [firstClassMember] = classMembers;

    if (firstClassMember === undefined) {
      throw new Error("Expected class member");
    }

    expect(service.getKey(firstClassMember)).toBe("7");
  });

  it("returns null when named node key is neither identifier/private/string/numeric", () => {
    const sourceFile = createSourceFile(
      "unsupported-name.ts",
      "class Example { [`template-name`] = 1; }",
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const classDeclaration = sourceFile.statements[0];
    if (
      classDeclaration === undefined ||
      !isClassDeclaration(classDeclaration)
    ) {
      throw new Error("Expected class declaration");
    }
    const nodeWithUnsupportedName = classDeclaration.members[0];
    if (nodeWithUnsupportedName === undefined) {
      throw new Error("Expected class member");
    }

    expect(service.getKey(nodeWithUnsupportedName)).toBeNull();
  });

  it("filters by the same key and the same kind", () => {
    const sourceFile = createSourceFile(
      "filter.ts",
      [
        'import firstImport from "sample";',
        'import secondImport from "other";',
        'export { sampleExport } from "sample";',
        'sampleCall("alpha");',
      ].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const firstImport = sourceFile.statements[0];
    const secondImport = sourceFile.statements[1];
    const exportDeclaration = sourceFile.statements[2];
    const expressionStatement = sourceFile.statements[3];

    if (
      firstImport === undefined ||
      secondImport === undefined ||
      exportDeclaration === undefined ||
      expressionStatement === undefined
    ) {
      throw new Error("Expected test statements");
    }

    expect(
      service.filterBySameKey(
        [firstImport, secondImport, exportDeclaration, expressionStatement],
        firstImport,
      ),
    ).toStrictEqual([firstImport, exportDeclaration]);
    expect(
      service.filterBySameKind(
        [firstImport, secondImport, exportDeclaration, expressionStatement],
        firstImport,
      ),
    ).toStrictEqual([firstImport, secondImport]);
  });

  it("returns semantic children without the end-of-file token", () => {
    const sourceFile = createSourceFile(
      "children.ts",
      ['import sample from "sample";', 'sampleCall("alpha");'].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const children = service.getChildren(sourceFile);

    expect(children).toHaveLength(2);
    expect(
      children.every((child) => child.kind !== SyntaxKind.EndOfFileToken),
    ).toBe(true);
  });
});
