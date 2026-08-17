import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ANALYSIS_MODULES } from "../../../testing/modules";
import { buildFixtureProgram } from "../../../testing/programs";
import { ClassHierarchyService } from "../class-hierarchy/class-hierarchy.service";
import { ExternalService } from "../class-hierarchy/external.service";

import { SymbolResolutionService } from "./symbol-resolution.service";

import type { ResolvedCallSite } from "./edges.types";

/** Finds the first node in a set of files that matches a predicate. */
function findNode<TNode extends ts.Node>(
  sourceFiles: readonly ts.SourceFile[],
  matches: (node: ts.Node) => node is TNode,
): TNode | undefined {
  const visit = (node: ts.Node): TNode | undefined => {
    if (matches(node)) {
      return node;
    }

    return ts.forEachChild(node, visit);
  };

  for (const sourceFile of sourceFiles) {
    const found = visit(sourceFile);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

/** Resolves the first call expression in an in-memory source file. */
function resolveFirstCall(source: string): ResolvedCallSite {
  const projectProgram = buildFixtureProgram({
    "packages/example/src/modules/a/a.service.ts": source,
  });
  const external = new ExternalService();

  external.configure({
    ownedFilePaths: projectProgram.ownedFilePaths,
    workspaceRoot: "/workspace",
  });

  const hierarchy = new ClassHierarchyService(external);

  hierarchy.build({ maximumFanOut: 8, programs: [projectProgram] });

  const subject = new SymbolResolutionService(hierarchy, external);
  const call = findNode(
    projectProgram.program.getSourceFiles(),
    ts.isCallExpression,
  );

  if (call === undefined) {
    throw new Error("No call expression in the fixture");
  }

  return subject.resolve({ checker: projectProgram.checker, expression: call });
}

/** Resolves the first `new` expression in an in-memory source file. */
function resolveFirstConstruction(source: string): ResolvedCallSite {
  const projectProgram = buildFixtureProgram({
    "packages/example/src/modules/a/a.service.ts": source,
  });
  const external = new ExternalService();

  external.configure({
    ownedFilePaths: projectProgram.ownedFilePaths,
    workspaceRoot: "/workspace",
  });

  const subject = new SymbolResolutionService(
    new ClassHierarchyService(external),
    external,
  );
  const construction = findNode(
    projectProgram.program.getSourceFiles(),
    ts.isNewExpression,
  );

  if (construction === undefined) {
    throw new Error("No new expression in the fixture");
  }

  return subject.resolveConstructor({
    checker: projectProgram.checker,
    expression: construction,
  });
}

describe(SymbolResolutionService, () => {
  let service: SymbolResolutionService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [...ANALYSIS_MODULES],
      providers: [SymbolResolutionService],
    }).compile();

    service = await module.resolve(SymbolResolutionService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("marks a plain call as direct", () => {
    const resolved = resolveFirstCall(
      "function work(): void {}\nexport function entry(): void { work(); }",
    );

    expect(resolved.resolution).toBe("direct");
    expect(resolved.declarations).toHaveLength(1);
  });

  it("records a computed member call with its reason", () => {
    const resolved = resolveFirstCall(`
      export function entry(target: Record<string, () => void>, key: string): void {
        target[key]();
      }
    `);

    expect(resolved.reason).toBe("computed-member");
  });

  it("follows a member named by a string literal", () => {
    const resolved = resolveFirstCall(`
      const handlers = { run(): void {} };
      export function entry(): void { handlers["run"](); }
    `);

    expect(resolved.declarations).toHaveLength(1);
  });

  it("records a call on an expression with no symbol", () => {
    const resolved = resolveFirstCall(`
      export function entry(make: () => () => void): void { make()(); }
    `);

    expect(resolved.reason).toBe("dynamic-value");
  });

  it("records a call through a function-typed parameter", () => {
    const resolved = resolveFirstCall(
      "export function entry(callback: () => void): void { callback(); }",
    );

    expect(resolved.reason).toBe("dynamic-value");
  });

  it("finds nothing to call for a class with no constructor", () => {
    const resolved = resolveFirstConstruction(
      "class Thing {}\nexport function entry(): void { new Thing(); }",
    );

    expect(resolved.declarations).toStrictEqual([]);
    expect(resolved.reason).toBeUndefined();
  });

  it("finds the constructor a construction actually runs", () => {
    const resolved = resolveFirstConstruction(`
      class Thing { constructor() { this.warm(); } public warm(): void {} }
      export function entry(): void { new Thing(); }
    `);

    expect(resolved.declarations).toHaveLength(1);
  });

  it("reports no implementation for a member of an inline object type", () => {
    const resolved = resolveFirstCall(`
      export function entry(target: { runInline(): void }): void {
        target.runInline();
      }
    `);

    expect(resolved.reason).toBe("no-implementation");
  });

  it("reports no implementation for an interface nothing satisfies", () => {
    const resolved = resolveFirstCall(`
      interface Runner { runNothing(): void; }
      export function entry(runner: Runner): void { runner.runNothing(); }
    `);

    expect(resolved.reason).toBe("no-implementation");
  });
});
