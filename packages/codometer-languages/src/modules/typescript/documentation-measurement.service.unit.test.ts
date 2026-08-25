import { Test } from "@nestjs/testing";
import tsCompiler from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { DocumentationMeasurementService } from "./documentation-measurement.service";

import type { TypescriptWalkContext } from "./typescript.types";
import type { ResolvedCodometerDocumentationConfiguration } from "@codometer/configuration";

/** Builds the walk context a measurement is taken against. */
function buildContext(
  source: string,
  documentation: ResolvedCodometerDocumentationConfiguration | undefined,
): { context: TypescriptWalkContext; node: tsCompiler.Node } {
  const sourceFile = tsCompiler.createSourceFile(
    "src/foo.ts",
    source,
    tsCompiler.ScriptTarget.Latest,
    true,
  );
  const [node] = sourceFile.statements;

  if (node === undefined) {
    throw new Error("Expected the source to declare at least one statement.");
  }

  return {
    context: {
      counters: [],
      documentation,
      filePath: "src/foo.ts",
      insideClass: false,
      sourceFile,
      stats: {
        asyncFunctions: 0,
        blockComments: 0,
        classes: 0,
        commentLines: 0,
        comments: 0,
        constants: 0,
        decorators: 0,
        docComments: 0,
        docTags: {},
        documentation: [],
        enums: 0,
        exported: 0,
        externalPackages: new Set(),
        functions: 0,
        genericDeclarations: 0,
        imports: 0,
        interfaces: 0,
        jsFiles: 0,
        lineComments: 0,
        lines: 0,
        methods: 0,
        symbolCounts: {},
        syncFunctions: 0,
        testFiles: 0,
        todos: 0,
        tsFiles: 0,
      },
    },
    node,
  };
}

const documentation: ResolvedCodometerDocumentationConfiguration = {
  default: 6,
  kinds: { class: 6 },
  severity: "fail",
  unit: "lines",
};

describe(DocumentationMeasurementService, () => {
  let service: DocumentationMeasurementService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DocumentationMeasurementService],
    }).compile();

    service = await module.resolve(DocumentationMeasurementService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns undefined when the walk carries no documentation configuration", () => {
    const { context, node } = buildContext(
      `/**
        * A class.
        */
       export class Foo {}`,
      undefined,
    );

    expect(service.measure(node, context)).toBeUndefined();
  });

  it("returns undefined for a declaration with no JSDoc comment", () => {
    const { context, node } = buildContext(
      `export class Foo {}`,
      documentation,
    );

    expect(service.measure(node, context)).toBeUndefined();
  });

  it("returns undefined for a plain block comment, not a JSDoc one", () => {
    const { context, node } = buildContext(
      `/* Not a doc comment. */
       export class Foo {}`,
      documentation,
    );

    expect(service.measure(node, context)).toBeUndefined();
  });

  it("measures lines, the raw comment block's line count", () => {
    const { context, node } = buildContext(
      `/**
        * Line one.
        * Line two.
        */
       export class Foo {}`,
      documentation,
    );

    expect(service.measure(node, context)).toMatchObject({
      breached: false,
      kind: "class",
      measured: 4,
      unit: "lines",
    });
  });

  it("measures characters, the raw comment block's length", () => {
    const text = "/** Short. */";
    const { context, node } = buildContext(
      `${text}\n       export class Foo {}`,
      { ...documentation, unit: "characters" },
    );

    expect(service.measure(node, context)).toMatchObject({
      measured: text.length,
      unit: "characters",
    });
  });

  it("measures words, ignoring the comment delimiters and leading asterisks", () => {
    const { context, node } = buildContext(
      `/**
        * This comment has exactly seven words total.
        */
       export class Foo {}`,
      { ...documentation, unit: "words" },
    );

    expect(service.measure(node, context)).toMatchObject({
      measured: 7,
      unit: "words",
    });
  });

  it("counts words on a single-line comment the same way", () => {
    const { context, node } = buildContext(
      `/** Four words right here. */
       export class Foo {}`,
      { ...documentation, unit: "words" },
    );

    expect(service.measure(node, context)).toMatchObject({ measured: 4 });
  });

  it("marks a declaration whose measured length exceeds its kind's limit as breached", () => {
    const { context, node } = buildContext(
      `/**
        * One.
        * Two.
        * Three.
        */
       export class Foo {}`,
      { ...documentation, kinds: { class: 2 } },
    );

    expect(service.measure(node, context)).toMatchObject({
      breached: true,
      limit: 2,
    });
  });

  it("falls back to the default limit for a kind naming none", () => {
    const { context, node } = buildContext(
      `/**
        * An interface with no configured kind limit.
        */
       export interface Bar {}`,
      { ...documentation, kinds: {} },
    );

    expect(service.measure(node, context)).toMatchObject({ limit: 6 });
  });

  it("names the declaration by its own identifier", () => {
    const { context, node } = buildContext(
      `/**
        * A function.
        */
       export function greet(): void {}`,
      documentation,
    );

    expect(service.measure(node, context)).toMatchObject({
      declaration: "greet",
      kind: "function",
    });
  });

  it("names an anonymous declaration as such", () => {
    const { context, node } = buildContext(
      `/**
        * An anonymous function.
        */
       export default function (): void {}`,
      documentation,
    );

    expect(service.measure(node, context)).toMatchObject({
      declaration: "(anonymous)",
    });
  });

  it("reports the 1-indexed line the declaration itself starts on", () => {
    const { context, node } = buildContext(
      `// A leading line comment.

       /**
        * A class.
        */
       export class Foo {}`,
      documentation,
    );

    expect(service.measure(node, context)).toMatchObject({ line: 6 });
  });

  it("returns undefined for a node kind no documentation limit can name", () => {
    const { context, node } = buildContext(
      `/**
        * A comment above something that is not a documentable declaration.
        */
       import "./whatever";`,
      documentation,
    );

    expect(service.measure(node, context)).toBeUndefined();
  });
});
