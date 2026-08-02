import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MeasureTypescriptService } from "./measure-typescript.service";

const { readFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn<(filePath: string, encoding: string) => string>(),
}));

vi.mock("node:fs", () => ({ readFileSync: readFileSyncMock }));

describe(MeasureTypescriptService, () => {
  let service: MeasureTypescriptService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeasureTypescriptService],
    }).compile();
    service = await module.resolve(MeasureTypescriptService);
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
      `import { foo } from "@scope/pkg";
       import bar from "other-pkg";
       import baz from "./local";`,
    );

    const result = service.analyze({
      sourceFiles: ["src/imports.ts"],
      workingDirectory: "/repo",
    });

    expect(result.imports).toBe(3);
    expect(result.externalPackages).toStrictEqual(
      new Set(["@scope/pkg", "other-pkg"]),
    );
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
});
