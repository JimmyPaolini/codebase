// `param` is the name of the JSDoc tag these tests count, not an abbreviation.
// cspell:ignore param

import { Test } from "@nestjs/testing";
import tsCompiler from "typescript";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TypescriptService } from "./typescript.service";

import type { TypescriptSymbolCounter } from "./typescript.types";

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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
      workingDirectory: "/repo",
    });

    expect(result.imports).toBe(3);
    expect(result.externalPackages).toStrictEqual(new Set(["external-lib"]));
  });

  it("ignores an empty import specifier for external package counting", () => {
    readFileSyncMock.mockReturnValue(`import "";`);

    const result = service.analyze({
      sourceFiles: ["src/empty-specifier.ts"],
      symbolCounters: [],
      workingDirectory: "/repo",
    });

    expect(result.imports).toBe(1);
    expect(result.externalPackages.size).toBe(0);
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
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
      symbolCounters: [],
      workingDirectory: "/repo",
    });

    expect(result.docComments).toBe(1);
    expect(result.docTags["deprecated"]).toBe(1);
    expect(result.docTags["experimental"]).toBe(1);
    expect(result.docTags["internal"]).toBe(1);
  });

  describe("configured symbol counters", () => {
    const staticMethods: TypescriptSymbolCounter = {
      kinds: ["method"],
      label: "Static Methods",
      modifiers: ["static"],
      patterns: [],
    };

    it("counts the class members carrying every required modifier", () => {
      readFileSyncMock.mockReturnValue(
        `export class Foo {
           static build(): Foo { return new Foo(); }
           static async load(): Promise<Foo> { return new Foo(); }
           instance(): void {}
         }`,
      );

      const result = service.analyze({
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [{ ...staticMethods }],
        workingDirectory: "/repo",
      });

      expect(result.symbolCounts["Static Methods"]).toBe(2);
    });

    it("requires every modifier a counter names, not just one", () => {
      readFileSyncMock.mockReturnValue(
        `export class Foo {
           static build(): void {}
           async load(): Promise<void> {}
           static async both(): Promise<void> {}
         }`,
      );

      const result = service.analyze({
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [
          {
            kinds: ["method"],
            label: "Static Async Methods",
            modifiers: ["async", "static"],
            patterns: [],
          },
        ],
        workingDirectory: "/repo",
      });

      expect(result.symbolCounts["Static Async Methods"]).toBe(1);
    });

    it("asks for the kind alone when a counter names no modifiers", () => {
      readFileSyncMock.mockReturnValue(
        `class Foo {
           get name(): string { return ""; }
           set name(value: string) {}
           private field = 1;
         }
         interface Shape { area: number }
         enum Color { Red }`,
      );

      const result = service.analyze({
        sourceFiles: ["src/shapes.ts"],
        symbolCounters: [
          {
            kinds: ["getter", "setter"],
            label: "Accessors",
            modifiers: [],
            patterns: [],
          },
          {
            kinds: ["enum", "interface"],
            label: "Shapes",
            modifiers: [],
            patterns: [],
          },
        ],
        workingDirectory: "/repo",
      });

      expect(result.symbolCounts["Accessors"]).toBe(2);
      expect(result.symbolCounts["Shapes"]).toBe(2);
    });

    // A class field holding an arrow function is a property: the arrow carries
    // none of the field's modifiers, so it is not found by asking for methods.
    it("treats a static arrow-function field as a property", () => {
      readFileSyncMock.mockReturnValue(
        `class Foo {
           static build = (): void => {};
         }`,
      );

      const result = service.analyze({
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [
          { ...staticMethods },
          {
            kinds: ["property"],
            label: "Static Properties",
            modifiers: ["static"],
            patterns: [],
          },
        ],
        workingDirectory: "/repo",
      });

      expect(result.symbolCounts["Static Methods"]).toBe(0);
      expect(result.symbolCounts["Static Properties"]).toBe(1);
    });

    it("reports zero for a counter nothing in the repository matches", () => {
      readFileSyncMock.mockReturnValue(`export const value = 1;`);

      const result = service.analyze({
        sourceFiles: ["src/value.ts"],
        symbolCounters: [{ ...staticMethods }],
        workingDirectory: "/repo",
      });

      expect(result.symbolCounts).toStrictEqual({ "Static Methods": 0 });
    });

    // `default` is a modifier keyword the matcher vocabulary has no name for,
    // and passing over it must not disturb the modifiers beside it.
    it("ignores modifier keywords a counter cannot ask for", () => {
      readFileSyncMock.mockReturnValue(
        `export default class Foo {
           static build(): void {}
         }`,
      );

      const result = service.analyze({
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [
          { ...staticMethods },
          {
            kinds: ["class"],
            label: "Exported Classes",
            modifiers: ["export"],
            patterns: [],
          },
        ],
        workingDirectory: "/repo",
      });

      expect(result.symbolCounts["Static Methods"]).toBe(1);
      expect(result.symbolCounts["Exported Classes"]).toBe(1);
    });

    it("searches only the files a counter's patterns name", () => {
      readFileSyncMock.mockReturnValue(`class Foo { static build(): void {} }`);

      const result = service.analyze({
        sourceFiles: ["packages/one/src/foo.ts", "applications/two/src/foo.ts"],
        symbolCounters: [{ ...staticMethods, patterns: ["packages/**"] }],
        workingDirectory: "/repo",
      });

      expect(result.symbolCounts["Static Methods"]).toBe(1);
    });
  });

  describe("documentation length measurement", () => {
    const documentation = {
      default: 6,
      kinds: { class: 6, interface: 5, method: 4, property: 3 },
      severity: "fail" as const,
      unit: "lines" as const,
    };

    it("does nothing when no documentation configuration is given", () => {
      readFileSyncMock.mockReturnValue(
        `/**
          * A class.
          */
         export class Foo {}`,
      );

      const result = service.analyze({
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      });

      expect(result.documentation).toStrictEqual([]);
    });

    it("measures a documented class, interface, function, method, and property under their limits", () => {
      readFileSyncMock.mockReturnValue(
        `/**
          * A class.
          */
         export class Foo {
           /**
            * A property.
            */
           value = 1;

           /**
            * A method.
            */
           run(): void {}
         }

         /**
          * An interface.
          */
         export interface Bar {}

         /**
          * A function.
          */
         export function greet(): void {}`,
      );

      const result = service.analyze({
        documentation,
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      });

      expect(
        result.documentation.map((measurement) => ({
          breached: measurement.breached,
          declaration: measurement.declaration,
          kind: measurement.kind,
        })),
      ).toStrictEqual([
        { breached: false, declaration: "Foo", kind: "class" },
        { breached: false, declaration: "value", kind: "property" },
        { breached: false, declaration: "run", kind: "method" },
        { breached: false, declaration: "Bar", kind: "interface" },
        { breached: false, declaration: "greet", kind: "function" },
      ]);
    });

    it("marks a declaration whose comment exceeds its kind's limit as breached", () => {
      readFileSyncMock.mockReturnValue(
        `/**
          * A class.
          * With far too many lines of explanation.
          */
         export class Foo {
           value = 1;
         }`,
      );

      const [measurement] = service.analyze({
        documentation: { ...documentation, kinds: { class: 2 } },
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      }).documentation;

      expect(measurement?.breached).toBe(true);
      expect(measurement?.limit).toBe(2);
      expect(measurement?.kind).toBe("class");
    });

    it("falls back to the default limit for a kind naming none", () => {
      readFileSyncMock.mockReturnValue(
        `/**
          * An interface with no configured kind limit.
          */
         export interface Bar {}`,
      );

      const [measurement] = service.analyze({
        documentation: { ...documentation, kinds: {} },
        sourceFiles: ["src/bar.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      }).documentation;

      expect(measurement?.limit).toBe(6);
    });

    it("measures characters instead of lines when configured", () => {
      readFileSyncMock.mockReturnValue(
        `/** Short. */
         export class Foo {}`,
      );

      const [measurement] = service.analyze({
        documentation: { ...documentation, unit: "characters" },
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      }).documentation;

      expect(measurement?.unit).toBe("characters");
      expect(measurement?.measured).toBe("/** Short. */".length);
    });

    it("does not report a declaration with no JSDoc comment at all", () => {
      readFileSyncMock.mockReturnValue(`export class Foo {}`);

      const result = service.analyze({
        documentation,
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      });

      expect(result.documentation).toStrictEqual([]);
    });

    it("does not treat a plain block comment as JSDoc", () => {
      readFileSyncMock.mockReturnValue(
        `/* Not a doc comment. */
         export class Foo {}`,
      );

      const result = service.analyze({
        documentation,
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      });

      expect(result.documentation).toStrictEqual([]);
    });

    it("reports the file and 1-indexed line of the declaration", () => {
      readFileSyncMock.mockReturnValue(
        `// A leading line comment.

         /**
          * A class.
          */
         export class Foo {}`,
      );

      const [measurement] = service.analyze({
        documentation,
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      }).documentation;

      expect(measurement?.file).toBe("src/foo.ts");
      expect(measurement?.line).toBe(6);
    });

    it("measures a documented enum under the default limit", () => {
      readFileSyncMock.mockReturnValue(
        `/**
          * A status.
          */
         export enum Status {
           Active,
           Inactive,
         }`,
      );

      const [measurement] = service.analyze({
        documentation,
        sourceFiles: ["src/status.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      }).documentation;

      expect(measurement).toMatchObject({
        breached: false,
        declaration: "Status",
        kind: "enum",
      });
    });

    it("measures a documented getter and setter under the default limit", () => {
      readFileSyncMock.mockReturnValue(
        `export class Foo {
           /**
            * The value.
            */
           get value(): number {
             return 1;
           }

           /**
            * Sets the value.
            */
           set value(next: number) {}
         }`,
      );

      const result = service.analyze({
        documentation,
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      });

      expect(
        result.documentation.map((measurement) => ({
          breached: measurement.breached,
          declaration: measurement.declaration,
          kind: measurement.kind,
        })),
      ).toStrictEqual([
        { breached: false, declaration: "value", kind: "getter" },
        { breached: false, declaration: "value", kind: "setter" },
      ]);
    });

    it("names an anonymous default-exported function as such", () => {
      readFileSyncMock.mockReturnValue(
        `/**
          * An anonymous function.
          */
         export default function (): void {}`,
      );

      const [measurement] = service.analyze({
        documentation,
        sourceFiles: ["src/foo.ts"],
        symbolCounters: [],
        workingDirectory: "/repo",
      }).documentation;

      expect(measurement?.declaration).toBe("(anonymous)");
    });
  });
});
