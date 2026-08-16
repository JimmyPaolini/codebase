// `param` is the name of the JSDoc tag these tests count, not an abbreviation.
// cspell:ignore param

import { Test } from "@nestjs/testing";
import tsCompiler from "typescript";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TypescriptService } from "./typescript.service";

const { readFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn<(filePath: string, encoding: string) => string>(),
}));

vi.mock("node:fs", () => ({ readFileSync: readFileSyncMock }));

describe(TypescriptService, () => {
  let service: TypescriptService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptService],
    }).compile();
    service = await module.resolve(TypescriptService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts classes, exported symbols, and methods", () => {
    readFileSyncMock.mockReturnValue(
      `export class Foo {
         bar(): void {}
         async baz(): Promise<void> {}
       }`,
    );

    const result = service.analyze({
      sourceFiles: ["src/foo.ts"],
      workingDirectory: "/repo",
    });

    expect(result.classes).toBe(1);
    expect(result.exported).toBe(1);
    expect(result.methods).toBe(2);
    expect(result.asyncFunctions).toBe(1);
    expect(result.syncFunctions).toBe(1);
    expect(result.functions).toBe(0);
  });

  it("counts top-level functions and distinguishes async vs sync", () => {
    readFileSyncMock.mockReturnValue(
      `export function greet(): void {}
       export async function fetchData(): Promise<string> { return ""; }`,
    );

    const result = service.analyze({
      sourceFiles: ["src/utils.ts"],
      workingDirectory: "/repo",
    });

    expect(result.functions).toBe(2);
    expect(result.asyncFunctions).toBe(1);
    expect(result.syncFunctions).toBe(1);
    expect(result.exported).toBe(2);
  });

  it("counts interfaces, enums, and generic declarations", () => {
    readFileSyncMock.mockReturnValue(
      `export interface Repo<T> {}
       export enum Color { Red, Green }`,
    );

    const result = service.analyze({
      sourceFiles: ["src/types.ts"],
      workingDirectory: "/repo",
    });

    expect(result.interfaces).toBe(1);
    expect(result.enums).toBe(1);
    expect(result.genericDeclarations).toBe(1);
    expect(result.exported).toBe(2);
  });

  it("counts imports and tracks external package names", () => {
    readFileSyncMock.mockReturnValue(
      `import { foo } from "@scope/package";
       import bar from "other-package";
       import baz from "./local";`,
    );

    const result = service.analyze({
      sourceFiles: ["src/imports.ts"],
      workingDirectory: "/repo",
    });

    expect(result.imports).toBe(3);
    expect(result.externalPackages).toStrictEqual(
      new Set(["@scope/package", "other-package"]),
    );
  });

  it("counts comments, doc comments, and doc tags", () => {
    readFileSyncMock.mockReturnValue(
      `// line comment
       /* block comment */
       /**
       * @param value
       * @returns string
       */
       const answer = 42;`,
    );

    const result = service.analyze({
      sourceFiles: ["src/comments.ts"],
      workingDirectory: "/repo",
    });

    expect(result.comments).toBe(3);
    expect(result.commentLines).toBe(5);
    expect(result.lineComments).toBe(1);
    expect(result.blockComments).toBe(1);
    expect(result.docComments).toBe(1);
    expect(result.docTags["param"]).toBe(1);
    expect(result.docTags["returns"]).toBe(1);
  });

  it("counts TODO and FIXME comments", () => {
    readFileSyncMock.mockReturnValue(
      `// TODO: implement this
       // FIXME: broken
       const x = 1;`,
    );

    const result = service.analyze({
      sourceFiles: ["src/todos.ts"],
      workingDirectory: "/repo",
    });

    expect(result.todos).toBe(2);
  });

  it("counts const declarations", () => {
    readFileSyncMock.mockReturnValue(
      `export const A = 1, B = 2;
       let mutable = 3;`,
    );

    const result = service.analyze({
      sourceFiles: ["src/consts.ts"],
      workingDirectory: "/repo",
    });

    expect(result.constants).toBe(2);
    expect(result.exported).toBe(2);
  });

  it("counts class property functions, accessors, and type aliases", () => {
    readFileSyncMock.mockReturnValue(
      `type LocalTypeAlias<T> = T;
       class Worker {
         get size(): number { return 1; }
         set size(value: number) { void value; }
         task = async (): Promise<void> => {};
       }`,
    );

    const result = service.analyze({
      sourceFiles: ["src/advanced.ts"],
      workingDirectory: "/repo",
    });

    expect(result.methods).toBe(3);
    expect(result.asyncFunctions).toBe(1);
    expect(result.genericDeclarations).toBe(1);
    expect(result.exported).toBe(0);
  });

  it("does not count non-const variable statements", () => {
    readFileSyncMock.mockReturnValue("let mutable = 1;");

    const result = service.analyze({
      sourceFiles: ["src/mutable.ts"],
      workingDirectory: "/repo",
    });

    expect(result.constants).toBe(0);
  });

  it("counts function expressions and decorators", () => {
    readFileSyncMock.mockReturnValue(
      `@sealed
       export class DecoratedClass {}
       const worker = function namedWorker(): void {};`,
    );

    const result = service.analyze({
      sourceFiles: ["src/decorated.ts"],
      workingDirectory: "/repo",
    });

    expect(result.decorators).toBe(1);
    expect(result.functions).toBe(1);
    expect(result.syncFunctions).toBe(1);
    expect(result.classes).toBe(1);
  });

  it("counts class expressions and JavaScript/TSX file kinds", () => {
    readFileSyncMock
      .mockReturnValueOnce(
        `const Worker = class WorkerClass {
           run(): void {}
         };`,
      )
      .mockReturnValueOnce("const element = <div>Hello</div>;")
      .mockReturnValueOnce("module.exports = {};");

    const result = service.analyze({
      sourceFiles: ["src/class-expression.ts", "src/view.tsx", "src/index.js"],
      workingDirectory: "/repo",
    });

    expect(result.classes).toBe(1);
    expect(result.methods).toBe(1);
    expect(result.tsFiles).toBe(2);
    expect(result.jsFiles).toBe(1);
  });

  it("ignores relative and absolute imports for external package counting", () => {
    readFileSyncMock.mockReturnValue(
      `import "./local";
       import "/absolute/path";
       import "external-lib";`,
    );

    const result = service.analyze({
      sourceFiles: ["src/imports-mixed.ts"],
      workingDirectory: "/repo",
    });

    expect(result.imports).toBe(3);
    expect(result.externalPackages).toStrictEqual(new Set(["external-lib"]));
  });

  it("covers private node helpers for non-modifier and non-variable inputs", () => {
    const hasAsyncKeyword = Reflect.get(service, "hasAsyncKeyword") as (
      node: tsCompiler.Node,
    ) => boolean;
    const hasExportKeyword = Reflect.get(service, "hasExportKeyword") as (
      node: tsCompiler.Node,
    ) => boolean;
    const hasTypeParameters = Reflect.get(service, "hasTypeParameters") as (
      node: tsCompiler.Node,
    ) => boolean;
    const handleVariable = Reflect.get(service, "handleVariable") as (
      node: tsCompiler.Node,
      stats: {
        constants: number;
        exported: number;
      },
    ) => void;

    const identifierNode = tsCompiler.factory.createIdentifier("value");
    const typeAliasWithoutTypeParameters =
      tsCompiler.factory.createTypeAliasDeclaration(
        undefined,
        "Alias",
        undefined,
        tsCompiler.factory.createKeywordTypeNode(
          tsCompiler.SyntaxKind.StringKeyword,
        ),
      );
    const nonConstVariableStatement =
      tsCompiler.factory.createVariableStatement(
        undefined,
        tsCompiler.factory.createVariableDeclarationList(
          [tsCompiler.factory.createVariableDeclaration("mutable")],
          tsCompiler.NodeFlags.Let,
        ),
      );
    const helperStats = {
      constants: 0,
      exported: 0,
    };

    expect(hasAsyncKeyword(identifierNode)).toBe(false);
    expect(hasExportKeyword(identifierNode)).toBe(false);
    expect(hasTypeParameters(identifierNode)).toBe(false);
    expect(hasTypeParameters(typeAliasWithoutTypeParameters)).toBe(false);

    handleVariable(identifierNode, helperStats);
    handleVariable(nonConstVariableStatement, helperStats);

    expect(helperStats.constants).toBe(0);
    expect(helperStats.exported).toBe(0);
  });

  it("covers exported and local interface/type alias branches", () => {
    readFileSyncMock.mockReturnValue(
      `import packageMember from "plain-package/submodule";
       import scopedMember from "@scope/package/submodule";
       export interface ExportedInterface<T> {}
       interface LocalInterface {}
       export type ExportedTypeAlias<T> = T;
       type LocalTypeAlias = string;`,
    );

    const result = service.analyze({
      sourceFiles: ["src/type-shapes.ts"],
      workingDirectory: "/repo",
    });

    expect(result.imports).toBe(2);
    expect(result.interfaces).toBe(2);
    expect(result.genericDeclarations).toBe(2);
    expect(result.externalPackages).toStrictEqual(
      new Set(["@scope/package", "plain-package"]),
    );
    expect(result.exported).toBe(2);
  });

  it("covers generic class and function branches with local enums", () => {
    readFileSyncMock.mockReturnValue(
      `class GenericClass<T> {}
       enum LocalEnum { A }
       function genericFunction<T>(value: T): T { return value; }`,
    );

    const result = service.analyze({
      sourceFiles: ["src/generics.ts"],
      workingDirectory: "/repo",
    });

    expect(result.classes).toBe(1);
    expect(result.enums).toBe(1);
    expect(result.functions).toBe(1);
    expect(result.genericDeclarations).toBe(2);
  });

  it("sums line counts across multiple files", () => {
    readFileSyncMock
      .mockReturnValueOnce("line1\nline2\nline3")
      .mockReturnValueOnce("a\nb");

    const result = service.analyze({
      sourceFiles: ["src/a.ts", "src/b.ts"],
      workingDirectory: "/repo",
    });

    expect(result.lines).toBe(5);
  });

  it("handles doc comments without @ prefix tags", () => {
    readFileSyncMock.mockReturnValue(
      `/**
        * Plain description without tags
        * Another line
        */
        const x = 1;`,
    );

    const result = service.analyze({
      sourceFiles: ["src/no-tags.ts"],
      workingDirectory: "/repo",
    });

    expect(result.docComments).toBe(1);
    expect(result.docTags).toStrictEqual({});
  });

  it("counts helper calls for non-import nodes", () => {
    const handleImport = Reflect.get(service, "handleImport") as (
      node: tsCompiler.Node,
      stats: {
        externalPackages: Set<string>;
        imports: number;
      },
    ) => void;
    const stats = {
      externalPackages: new Set<string>(),
      imports: 0,
    };

    handleImport(tsCompiler.factory.createIdentifier("value"), stats);

    expect(stats.imports).toBe(1);
    expect(stats.externalPackages.size).toBe(0);
  });

  it("counts relative imports without treating them as external packages", () => {
    readFileSyncMock.mockReturnValue(
      `import { helper } from "../utils";
       import "./styles.css";`,
    );

    const result = service.analyze({
      sourceFiles: ["src/local.ts"],
      workingDirectory: "/repo",
    });

    expect(result.imports).toBe(2);
    expect(result.externalPackages.size).toBe(0);
  });

  it("handles edge case doc tags with special characters", () => {
    readFileSyncMock.mockReturnValue(
      `/**
        * @param-special test
        * @returns-value string
        * @see https://example.com
        */
        function test(): void {}`,
    );

    const result = service.analyze({
      sourceFiles: ["src/special-tags.ts"],
      workingDirectory: "/repo",
    });

    expect(result.docComments).toBe(1);
    expect(result.docTags["param-special"]).toBe(1);
    expect(result.docTags["returns-value"]).toBe(1);
    expect(result.docTags["see"]).toBe(1);
  });

  it("distinguishes between different doc tag styles", () => {
    readFileSyncMock.mockReturnValue(
      `/**
        * @deprecated
        * @experimental
        * @internal
        */
        const config = {};`,
    );

    const result = service.analyze({
      sourceFiles: ["src/decorators.ts"],
      workingDirectory: "/repo",
    });

    expect(result.docComments).toBe(1);
    expect(result.docTags["deprecated"]).toBe(1);
    expect(result.docTags["experimental"]).toBe(1);
    expect(result.docTags["internal"]).toBe(1);
  });
});
