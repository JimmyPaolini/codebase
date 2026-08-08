# `metitur` Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `packages/metitur`, a NestJS command application that measures codebase statistics and optionally updates a README badge block.

**Architecture:** Six service modules (`file-discovery`, `typescript-analysis`, `python-analysis`, `statistics`, `readme-badges`) plus one command module (`measure`) are scaffolded with conformance generators and wired into `main.module.ts`. After validation, the old `scripts/codometer.ts` and `scripts/codometer.py` are deleted and the root `project.json` `codometer` target is updated to call the new app.

**Tech Stack:** NestJS, nest-commander, TypeScript compiler API (`typescript` package), Node.js `child_process`, `zod`, `vitest`

## Global Constraints

- All TS files must pass `nx run metitur:typecheck` with `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- No `any` types, no non-null assertions (`!`), no `eslint-disable` comments
- All public methods require explicit return types
- Use `.js` extensions in all relative imports
- File-level conventions: only imports + class at top level in `*.service.ts`, `*.command.ts`, `*.module.ts`; types in `*.types.ts`, constants in `*.constants.ts`
- Run `nx run metitur:analyze-code:write` then `nx run metitur:analyze-code:check` before every commit
- Commit message format: `type(metitur): <gitmoji> subject` — single line, no body

---

## File Map

```
packages/metitur/
  src/
    main.ts                                            # generated
    main.module.ts                                     # generated, modified in Task 7
    constants.ts                                       # generated
    repl.ts                                            # generated
    modules/
      logger/                                          # generated
      file-discovery/
        file-discovery.constants.ts                    # Task 2
        file-discovery.module.ts                       # generated Task 2
        file-discovery.service.ts                      # Task 2
        file-discovery.service.unit.test.ts            # Task 2
        file-discovery.types.ts                        # Task 2
      typescript-analysis/
        typescript-analysis.constants.ts               # Task 3
        typescript-analysis.module.ts                  # generated Task 3
        typescript-analysis.service.ts                 # Task 3
        typescript-analysis.service.unit.test.ts       # Task 3
        typescript-analysis.types.ts                   # Task 3
      python-analysis/
        analyze.py                                     # Task 4 (copied from scripts/)
        python-analysis.constants.ts                   # Task 4
        python-analysis.module.ts                      # generated Task 4
        python-analysis.service.ts                     # Task 4
        python-analysis.service.unit.test.ts           # Task 4
        python-analysis.types.ts                       # Task 4
      statistics/
        statistics.module.ts                           # generated Task 5
        statistics.service.ts                          # Task 5
        statistics.service.unit.test.ts                # Task 5
        statistics.types.ts                            # Task 5
      readme-badges/
        readme-badges.module.ts                        # generated Task 6
        readme-badges.service.ts                       # Task 6
        readme-badges.service.unit.test.ts             # Task 6
      measure/
        measure.command.ts                             # Task 7
        measure.command.unit.test.ts                   # Task 7
        measure.constants.ts                           # generated Task 7
        measure.module.ts                              # generated Task 7
        measure.types.ts                               # Task 7
  package.json                                         # generated
  project.json                                         # generated
  tsconfig.json                                        # generated
  eslint.config.ts                                     # generated
  vitest.config.ts                                     # generated
  AGENTS.md                                            # generated
  README.md                                            # generated
  testing/
    mocks.ts                                           # generated
    setup.ts                                           # generated
scripts/
  codometer.ts                                      # deleted Task 8
  codometer.py                                      # deleted Task 8
project.json (workspace root)                          # modified Task 8
```

---

## Task 1: Scaffold the application

**Files:**
- Create: `packages/metitur/` (entire tree from generator)

**Interfaces:**
- Produces: a working NestJS command application skeleton at `packages/metitur/`

- [ ] **Step 1: Run the generator**

```bash
cd /path/to/codebase-worktree
pnpm exec nx g conformance:nestjs-command-application --name=metitur --type=packages
```

When prompted interactively, confirm. The generator creates:
`packages/metitur/{package.json,project.json,tsconfig.json,eslint.config.ts,vitest.config.ts,AGENTS.md,README.md,src/main.ts,src/main.module.ts,src/constants.ts,src/repl.ts,src/modules/logger/**,testing/mocks.ts,testing/setup.ts}`

- [ ] **Step 2: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 3: Verify the project typechecks and the generated test passes**

```bash
pnpm exec nx run metitur:typecheck
pnpm exec nx run metitur:test:unit
```

Expected: all pass with no errors.

- [ ] **Step 4: Run analyze-code and fix any auto-fixable issues**

```bash
pnpm exec nx run metitur:analyze-code --configuration=write
pnpm exec nx run metitur:analyze-code --configuration=check
```

- [ ] **Step 5: Commit**

```bash
git add packages/metitur/
git commit -m "feat(metitur): ✨ scaffold nestjs-command-application"
```

---

## Task 2: `file-discovery` module

**Files:**
- Create: `packages/metitur/src/modules/file-discovery/file-discovery.types.ts`
- Create: `packages/metitur/src/modules/file-discovery/file-discovery.constants.ts`
- Create: `packages/metitur/src/modules/file-discovery/file-discovery.service.ts`
- Create: `packages/metitur/src/modules/file-discovery/file-discovery.service.unit.test.ts`
- Create: `packages/metitur/src/modules/file-discovery/file-discovery.module.ts`

**Interfaces:**
- Produces:
  ```ts
  // file-discovery.types.ts
  export interface FileDiscoveryResult {
    trackedFiles: string[];  // all non-excluded git-tracked files (relative to workingDirectory)
    sourceFiles: string[];   // TS + JS subset
    tsFiles: string[];
    jsFiles: string[];
    testFiles: string[];
    pyFiles: string[];
  }

  // file-discovery.service.ts
  discoverFiles(workingDirectory: string): FileDiscoveryResult
  ```

- [ ] **Step 1: Generate the service module**

```bash
pnpm exec nx g conformance:nestjs-service-module --name=file-discovery --project=metitur
```

This creates `file-discovery.module.ts`, `file-discovery.service.ts`, `file-discovery.service.unit.test.ts`, `file-discovery.types.ts`, `file-discovery.constants.ts`.

- [ ] **Step 2: Write the types**

Replace `packages/metitur/src/modules/file-discovery/file-discovery.types.ts`:

```ts
/** Categorized lists of file paths (relative to the working directory) discovered in a git repository. */
export interface FileDiscoveryResult {
  trackedFiles: string[];
  sourceFiles: string[];
  tsFiles: string[];
  jsFiles: string[];
  testFiles: string[];
  pyFiles: string[];
}
```

- [ ] **Step 3: Write the constants**

Replace `packages/metitur/src/modules/file-discovery/file-discovery.constants.ts`:

```ts
/** File extensions treated as TypeScript source. */
export const TS_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

/** File extensions treated as JavaScript source. */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** Path segments that cause a file to be excluded from analysis. */
export const EXCLUDE_PATHS = [
  "node_modules/",
  "dist/",
  ".nx/",
  "build/",
  "coverage/",
  "notepads/",
  "/templates/",
] as const;

/** Regex matching test and spec file names. */
export const TEST_FILE_REGEX =
  /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/;
```

- [ ] **Step 4: Write the failing test**

Replace `packages/metitur/src/modules/file-discovery/file-discovery.service.unit.test.ts`:

```ts
import * as fs from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { FileDiscoveryService } from "./file-discovery.service.js";

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn<(command: string, options?: object) => Buffer>(),
}));

vi.mock("node:child_process", () => ({ execSync: execSyncMock }));
vi.mock("node:fs");

describe(FileDiscoveryService, () => {
  let service: FileDiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [FileDiscoveryService],
    }).compile();
    service = await module.resolve(FileDiscoveryService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("categorizes TypeScript, JavaScript, Python, and test files", () => {
    execSyncMock.mockReturnValue(
      Buffer.from(
        [
          "src/app.ts",
          "src/app.test.ts",
          "src/util.js",
          "src/script.py",
          "node_modules/lib/index.ts",
          "dist/bundle.js",
        ].join("\n"),
      ),
    );

    const result = service.discoverFiles("/repo");

    expect(result.tsFiles).toEqual(["src/app.ts", "src/app.test.ts"]);
    expect(result.jsFiles).toEqual(["src/util.js"]);
    expect(result.testFiles).toEqual(["src/app.test.ts"]);
    expect(result.pyFiles).toEqual(["src/script.py"]);
    expect(result.sourceFiles).toEqual([
      "src/app.ts",
      "src/app.test.ts",
      "src/util.js",
    ]);
    expect(result.trackedFiles).not.toContain("node_modules/lib/index.ts");
    expect(result.trackedFiles).not.toContain("dist/bundle.js");
  });

  it("excludes files that do not exist on disk", () => {
    execSyncMock.mockReturnValue(Buffer.from("src/missing.ts\nsrc/present.ts"));
    vi.mocked(fs.existsSync).mockImplementation(
      (filePath) => filePath === "src/present.ts",
    );

    const result = service.discoverFiles("/repo");

    expect(result.trackedFiles).toEqual(["src/present.ts"]);
  });

  it("passes the working directory to git ls-files", () => {
    execSyncMock.mockReturnValue(Buffer.from(""));

    service.discoverFiles("/my/project");

    expect(execSyncMock).toHaveBeenCalledWith("git ls-files", {
      cwd: "/my/project",
    });
  });
});
```

- [ ] **Step 5: Run the test and verify it fails**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=file-discovery
```

Expected: FAIL — `FileDiscoveryService` has no `discoverFiles` method yet.

- [ ] **Step 6: Implement the service**

Replace `packages/metitur/src/modules/file-discovery/file-discovery.service.ts`:

```ts
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import {
  EXCLUDE_PATHS,
  JS_EXTENSIONS,
  TEST_FILE_REGEX,
  TS_EXTENSIONS,
} from "./file-discovery.constants.js";
import type { FileDiscoveryResult } from "./file-discovery.types.js";

/** Discovers and categorizes git-tracked files within a codebase directory. */
@Injectable()
export class FileDiscoveryService {
  // 🌎 Public Methods

  /** Returns categorized file path lists for the given codebase root. */
  discoverFiles(workingDirectory: string): FileDiscoveryResult {
    const allExtensions = new Set([...TS_EXTENSIONS, ...JS_EXTENSIONS]);

    const trackedFiles = execSync("git ls-files", { cwd: workingDirectory })
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean)
      .filter((filePath) => existsSync(filePath))
      .filter(
        (filePath) =>
          !EXCLUDE_PATHS.some((excluded) => filePath.includes(excluded)),
      );

    const sourceFiles = trackedFiles.filter((filePath) =>
      allExtensions.has(path.extname(filePath)),
    );

    return {
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ),
      pyFiles: trackedFiles.filter(
        (filePath) => path.extname(filePath) === ".py",
      ),
      sourceFiles,
      testFiles: sourceFiles.filter((filePath) =>
        TEST_FILE_REGEX.test(filePath),
      ),
      trackedFiles,
      tsFiles: sourceFiles.filter((filePath) =>
        TS_EXTENSIONS.has(path.extname(filePath)),
      ),
    };
  }
}
```

- [ ] **Step 7: Run the tests and verify they pass**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=file-discovery
```

Expected: all tests pass.

- [ ] **Step 8: Run analyze-code and commit**

```bash
pnpm exec nx run metitur:analyze-code --configuration=write
pnpm exec nx run metitur:analyze-code --configuration=check
git add packages/metitur/src/modules/file-discovery/
git commit -m "feat(metitur): ✨ add file-discovery module"
```

---

## Task 3: `typescript-analysis` module

**Files:**
- Create: `packages/metitur/src/modules/typescript-analysis/typescript-analysis.types.ts`
- Create: `packages/metitur/src/modules/typescript-analysis/typescript-analysis.constants.ts`
- Create: `packages/metitur/src/modules/typescript-analysis/typescript-analysis.service.ts`
- Create: `packages/metitur/src/modules/typescript-analysis/typescript-analysis.service.unit.test.ts`
- Create: `packages/metitur/src/modules/typescript-analysis/typescript-analysis.module.ts`

**Interfaces:**
- Consumes: `sourceFiles: string[]` (relative paths from `FileDiscoveryResult`), `workingDirectory: string`
- Produces:
  ```ts
  // typescript-analysis.types.ts
  export interface TypescriptAnalysisInput {
    workingDirectory: string;
    sourceFiles: string[];
  }

  export interface TypescriptAnalysisResult {
    lines: number;
    tsFiles: number;
    jsFiles: number;
    testFiles: number;
    classes: number;
    functions: number;
    methods: number;
    asyncFunctions: number;
    syncFunctions: number;
    interfaces: number;
    enums: number;
    constants: number;
    imports: number;
    externalPackages: Set<string>;
    decorators: number;
    exported: number;
    genericDeclarations: number;
    todos: number;
  }

  // typescript-analysis.service.ts
  analyze(input: TypescriptAnalysisInput): TypescriptAnalysisResult
  ```

- [ ] **Step 1: Generate the service module**

```bash
pnpm exec nx g conformance:nestjs-service-module --name=typescript-analysis --project=metitur
```

Also add `typescript` as a dependency (the compiler API):

```bash
pnpm add --filter metitur typescript
```

Note: `typescript` is already in `devDependencies` from the generator template — verify it is present in `packages/metitur/package.json`. If it is only in devDependencies, move it to dependencies since it is used at runtime for AST analysis.

- [ ] **Step 2: Write the types**

Replace `packages/metitur/src/modules/typescript-analysis/typescript-analysis.types.ts`:

```ts
/** Input to the TypeScript/JavaScript AST analysis step. */
export interface TypescriptAnalysisInput {
  workingDirectory: string;
  sourceFiles: string[];
}

/** Aggregated metrics collected from walking TypeScript and JavaScript ASTs. */
export interface TypescriptAnalysisResult {
  lines: number;
  tsFiles: number;
  jsFiles: number;
  testFiles: number;
  classes: number;
  functions: number;
  methods: number;
  asyncFunctions: number;
  syncFunctions: number;
  interfaces: number;
  enums: number;
  constants: number;
  imports: number;
  externalPackages: Set<string>;
  decorators: number;
  exported: number;
  genericDeclarations: number;
  todos: number;
}
```

- [ ] **Step 3: Write the constants**

Replace `packages/metitur/src/modules/typescript-analysis/typescript-analysis.constants.ts`:

```ts
/** Regex matching TODO and FIXME annotations inside comments. */
export const TODO_REGEX =
  /\/\/.*\b(?:TODO|FIXME)\b|\/\*[\s\S]*?\b(?:TODO|FIXME)\b[\s\S]*?\*\//g;
```

- [ ] **Step 4: Write the failing tests**

Replace `packages/metitur/src/modules/typescript-analysis/typescript-analysis.service.unit.test.ts`:

```ts
import { readFileSync } from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TypescriptAnalysisService } from "./typescript-analysis.service.js";

const { readFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn<(filePath: string, encoding: string) => string>(),
}));

vi.mock("node:fs", () => ({ readFileSync: readFileSyncMock }));

describe(TypescriptAnalysisService, () => {
  let service: TypescriptAnalysisService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptAnalysisService],
    }).compile();
    service = await module.resolve(TypescriptAnalysisService);
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
    expect(result.externalPackages).toEqual(new Set(["@scope/pkg", "other-pkg"]));
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
```

- [ ] **Step 5: Run the tests and verify they fail**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=typescript-analysis
```

Expected: FAIL — service has no `analyze` method.

- [ ] **Step 6: Implement the service**

Replace `packages/metitur/src/modules/typescript-analysis/typescript-analysis.service.ts`:

```ts
import { readFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import tsCompiler from "typescript";

import { TODO_REGEX } from "./typescript-analysis.constants.js";
import type {
  TypescriptAnalysisInput,
  TypescriptAnalysisResult,
} from "./typescript-analysis.types.js";

const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** Walks TypeScript and JavaScript ASTs to collect code metrics. */
@Injectable()
export class TypescriptAnalysisService {
  // 🔏 Private Methods

  private handleClass(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
  ): void {
    stats.classes++;
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  private handleEnum(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
  ): void {
    stats.enums++;
    if (this.hasExportKeyword(node)) stats.exported++;
  }

  private handleFunction(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
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

  private handleImport(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
  ): void {
    stats.imports++;
    const declaration = node as tsCompiler.ImportDeclaration;
    const specifier = (
      declaration.moduleSpecifier as tsCompiler.StringLiteral
    ).text;
    if (specifier && !specifier.startsWith(".") && !specifier.startsWith("/")) {
      const packageName = specifier.startsWith("@")
        ? specifier.split("/").slice(0, 2).join("/")
        : (specifier.split("/")[0] ?? specifier);
      stats.externalPackages.add(packageName);
    }
  }

  private handleInterface(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
  ): void {
    stats.interfaces++;
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  private handleMethodOrAccessor(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
  ): void {
    stats.methods++;
    if (this.hasAsyncKeyword(node)) {
      stats.asyncFunctions++;
    } else {
      stats.syncFunctions++;
    }
  }

  private handleTypeAlias(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
  ): void {
    if (this.hasExportKeyword(node)) stats.exported++;
    if (this.hasTypeParameters(node)) stats.genericDeclarations++;
  }

  private handleVariable(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
  ): void {
    const statement = node as tsCompiler.VariableStatement;
    const isConst =
      (statement.declarationList.flags & tsCompiler.NodeFlags.Const) !== 0;
    if (isConst) {
      const count = statement.declarationList.declarations.length;
      stats.constants += count;
      if (this.hasExportKeyword(node)) stats.exported += count;
    }
  }

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

  private walkNode(
    node: tsCompiler.Node,
    stats: TypescriptAnalysisResult,
    insideClass: boolean,
  ): void {
    switch (node.kind) {
      case tsCompiler.SyntaxKind.ClassDeclaration:
      case tsCompiler.SyntaxKind.ClassExpression:
        this.handleClass(node, stats);
        tsCompiler.forEachChild(node, (child) =>
          this.walkNode(child, stats, true),
        );
        return;

      case tsCompiler.SyntaxKind.ArrowFunction:
      case tsCompiler.SyntaxKind.FunctionDeclaration:
      case tsCompiler.SyntaxKind.FunctionExpression:
        this.handleFunction(node, stats, insideClass);
        break;

      case tsCompiler.SyntaxKind.Decorator:
        stats.decorators++;
        break;

      case tsCompiler.SyntaxKind.EnumDeclaration:
        this.handleEnum(node, stats);
        break;

      case tsCompiler.SyntaxKind.GetAccessor:
      case tsCompiler.SyntaxKind.MethodDeclaration:
      case tsCompiler.SyntaxKind.SetAccessor:
        this.handleMethodOrAccessor(node, stats);
        break;

      case tsCompiler.SyntaxKind.ImportDeclaration:
        this.handleImport(node, stats);
        break;

      case tsCompiler.SyntaxKind.InterfaceDeclaration:
        this.handleInterface(node, stats);
        break;

      case tsCompiler.SyntaxKind.TypeAliasDeclaration:
        this.handleTypeAlias(node, stats);
        break;

      case tsCompiler.SyntaxKind.VariableStatement:
        this.handleVariable(node, stats);
        break;

      default:
        break;
    }

    tsCompiler.forEachChild(node, (child) =>
      this.walkNode(child, stats, insideClass),
    );
  }

  // 🌎 Public Methods

  /** Analyzes TypeScript and JavaScript source files and returns aggregated AST metrics. */
  analyze(input: TypescriptAnalysisInput): TypescriptAnalysisResult {
    const { sourceFiles, workingDirectory } = input;

    const stats: TypescriptAnalysisResult = {
      asyncFunctions: 0,
      classes: 0,
      constants: 0,
      decorators: 0,
      enums: 0,
      exported: 0,
      externalPackages: new Set<string>(),
      functions: 0,
      genericDeclarations: 0,
      imports: 0,
      interfaces: 0,
      jsFiles: sourceFiles.filter((filePath) =>
        JS_EXTENSIONS.has(path.extname(filePath)),
      ).length,
      lines: 0,
      methods: 0,
      syncFunctions: 0,
      testFiles: sourceFiles.filter((filePath) =>
        /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/.test(
          filePath,
        ),
      ).length,
      todos: 0,
      tsFiles: sourceFiles.filter((filePath) =>
        !JS_EXTENSIONS.has(path.extname(filePath)),
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

      stats.lines += content.split("\n").length;
      stats.todos += (content.match(TODO_REGEX) ?? []).length;

      this.walkNode(sourceFile, stats, false);
    }

    return stats;
  }
}
```

- [ ] **Step 7: Run the tests and verify they pass**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=typescript-analysis
```

Expected: all tests pass.

- [ ] **Step 8: Run analyze-code and commit**

```bash
pnpm exec nx run metitur:analyze-code --configuration=write
pnpm exec nx run metitur:analyze-code --configuration=check
git add packages/metitur/src/modules/typescript-analysis/
git commit -m "feat(metitur): ✨ add typescript-analysis module"
```

---

## Task 4: `python-analysis` module

**Files:**
- Create: `packages/metitur/src/modules/python-analysis/analyze.py`
- Create: `packages/metitur/src/modules/python-analysis/python-analysis.types.ts`
- Create: `packages/metitur/src/modules/python-analysis/python-analysis.constants.ts`
- Create: `packages/metitur/src/modules/python-analysis/python-analysis.service.ts`
- Create: `packages/metitur/src/modules/python-analysis/python-analysis.service.unit.test.ts`
- Create: `packages/metitur/src/modules/python-analysis/python-analysis.module.ts`

**Interfaces:**
- Produces:
  ```ts
  // python-analysis.types.ts
  export interface PythonAnalysisResult {
    files: number;
    classes: number;
    functions: number;
    constants: number;
    protocols: number;
    imports: number;
    decorators: number;
    lines: number;
  }

  // python-analysis.service.ts
  async analyze(workingDirectory: string): Promise<PythonAnalysisResult>
  ```

- [ ] **Step 1: Generate the service module**

```bash
pnpm exec nx g conformance:nestjs-service-module --name=python-analysis --project=metitur
```

- [ ] **Step 2: Copy the Python script into the module**

```bash
cp scripts/codometer.py packages/metitur/src/modules/python-analysis/analyze.py
```

Do NOT delete `scripts/codometer.py` yet — that happens in Task 8.

- [ ] **Step 3: Write the types**

Replace `packages/metitur/src/modules/python-analysis/python-analysis.types.ts`:

```ts
/** Metrics collected from Python source files via AST analysis. */
export interface PythonAnalysisResult {
  files: number;
  classes: number;
  functions: number;
  constants: number;
  protocols: number;
  imports: number;
  decorators: number;
  lines: number;
}
```

- [ ] **Step 4: Write the constants**

Replace `packages/metitur/src/modules/python-analysis/python-analysis.constants.ts`:

```ts
/** A zeroed `PythonAnalysisResult` used when Python analysis is unavailable or skipped. */
export const EMPTY_PYTHON_RESULT = {
  classes: 0,
  constants: 0,
  decorators: 0,
  files: 0,
  functions: 0,
  imports: 0,
  lines: 0,
  protocols: 0,
} as const;
```

- [ ] **Step 5: Write the failing tests**

Replace `packages/metitur/src/modules/python-analysis/python-analysis.service.unit.test.ts`:

```ts
import { Test } from "@nestjs/testing";
import { createMock } from "@golevelup/ts-vitest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "../logger/logger.service.js";
import { PythonAnalysisService } from "./python-analysis.service.js";

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn<(command: string, options?: object) => Buffer>(),
}));

vi.mock("node:child_process", () => ({ execSync: execSyncMock }));

describe(PythonAnalysisService, () => {
  let service: PythonAnalysisService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PythonAnalysisService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    service = await module.resolve(PythonAnalysisService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("parses uv output and returns typed result", async () => {
    execSyncMock.mockReturnValue(
      Buffer.from(
        JSON.stringify({
          classes: 2,
          constants: 5,
          decorators: 3,
          files: 4,
          functions: 12,
          imports: 8,
          lines: 200,
          protocols: 1,
        }),
      ),
    );

    const result = await service.analyze("/my/project");

    expect(result.files).toBe(4);
    expect(result.classes).toBe(2);
    expect(result.functions).toBe(12);
    expect(result.protocols).toBe(1);
  });

  it("returns a zeroed result when uv is unavailable", async () => {
    execSyncMock.mockImplementation(() => {
      throw new Error("uv: command not found");
    });

    const result = await service.analyze("/my/project");

    expect(result.files).toBe(0);
    expect(result.lines).toBe(0);
  });

  it("returns a zeroed result when there are no Python files", async () => {
    execSyncMock.mockReturnValue(
      Buffer.from(
        JSON.stringify({
          classes: 0,
          constants: 0,
          decorators: 0,
          files: 0,
          functions: 0,
          imports: 0,
          lines: 0,
          protocols: 0,
        }),
      ),
    );

    const result = await service.analyze("/my/project");

    expect(result.files).toBe(0);
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=python-analysis
```

Expected: FAIL — service has no `analyze` method.

- [ ] **Step 7: Implement the service**

Replace `packages/metitur/src/modules/python-analysis/python-analysis.service.ts`:

```ts
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "../logger/logger.service.js";
import { EMPTY_PYTHON_RESULT } from "./python-analysis.constants.js";
import type { PythonAnalysisResult } from "./python-analysis.types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Runs the bundled Python analyzer script and returns aggregated Python metrics. */
@Injectable()
export class PythonAnalysisService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(PythonAnalysisService.name);
  }

  // 🔐 Private Fields

  private readonly scriptPath = path.resolve(__dirname, "analyze.py");

  // 🌎 Public Methods

  /** Runs Python analysis in the given directory; returns zeroed result on failure. */
  async analyze(workingDirectory: string): Promise<PythonAnalysisResult> {
    try {
      const output = execSync(
        `uv run python "${this.scriptPath}"`,
        { cwd: workingDirectory },
      )
        .toString()
        .trim();

      return JSON.parse(output) as PythonAnalysisResult;
    } catch (error: unknown) {
      this.logger.warn(
        `Python analysis unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { ...EMPTY_PYTHON_RESULT };
    }
  }
}
```

- [ ] **Step 8: Run the tests and verify they pass**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=python-analysis
```

Expected: all tests pass.

- [ ] **Step 9: Run analyze-code and commit**

```bash
pnpm exec nx run metitur:analyze-code --configuration=write
pnpm exec nx run metitur:analyze-code --configuration=check
git add packages/metitur/src/modules/python-analysis/
git commit -m "feat(metitur): ✨ add python-analysis module"
```

---

## Task 5: `statistics` module

**Files:**
- Create: `packages/metitur/src/modules/statistics/statistics.types.ts`
- Create: `packages/metitur/src/modules/statistics/statistics.service.ts`
- Create: `packages/metitur/src/modules/statistics/statistics.service.unit.test.ts`
- Create: `packages/metitur/src/modules/statistics/statistics.module.ts`

**Interfaces:**
- Consumes: `TypescriptAnalysisResult` (Task 3), `PythonAnalysisResult` (Task 4)
- Produces:
  ```ts
  // statistics.types.ts
  export interface StatisticsInput {
    workingDirectory: string;
    trackedFiles: string[];
    typescript: TypescriptAnalysisResult;
    python: PythonAnalysisResult;
  }

  export interface CodeStatistics {
    lines: number;
    repoSizeMiB: string;
    folders: number;
    sourceFiles: number;
    tsFiles: number;
    jsFiles: number;
    pyFiles: number;
    testFiles: number;
    externalPackages: number;
    classes: number;
    functions: number;
    asyncFunctions: number;
    syncFunctions: number;
    interfaces: number;
    genericDeclarations: number;
    enums: number;
    constants: number;
    imports: number;
    decorators: number;
    exportedSymbols: number;
    todos: number;
  }

  // statistics.service.ts
  compute(input: StatisticsInput): CodeStatistics
  ```

- [ ] **Step 1: Generate the service module**

```bash
pnpm exec nx g conformance:nestjs-service-module --name=statistics --project=metitur
```

- [ ] **Step 2: Write the types**

Replace `packages/metitur/src/modules/statistics/statistics.types.ts`:

```ts
import type { PythonAnalysisResult } from "../python-analysis/python-analysis.types.js";
import type { TypescriptAnalysisResult } from "../typescript-analysis/typescript-analysis.types.js";

/** Input to the statistics aggregation step. */
export interface StatisticsInput {
  workingDirectory: string;
  trackedFiles: string[];
  typescript: TypescriptAnalysisResult;
  python: PythonAnalysisResult;
}

/** Aggregated codebase statistics combining all language analyses. */
export interface CodeStatistics {
  lines: number;
  repoSizeMiB: string;
  folders: number;
  sourceFiles: number;
  tsFiles: number;
  jsFiles: number;
  pyFiles: number;
  testFiles: number;
  externalPackages: number;
  classes: number;
  functions: number;
  asyncFunctions: number;
  syncFunctions: number;
  interfaces: number;
  genericDeclarations: number;
  enums: number;
  constants: number;
  imports: number;
  decorators: number;
  exportedSymbols: number;
  todos: number;
}
```

- [ ] **Step 3: Write the failing tests**

Replace `packages/metitur/src/modules/statistics/statistics.service.unit.test.ts`:

```ts
import * as fs from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_PYTHON_RESULT } from "../python-analysis/python-analysis.constants.js";
import { StatisticsService } from "./statistics.service.js";

const { statSyncMock } = vi.hoisted(() => ({
  statSyncMock: vi.fn<(filePath: string) => { size: number }>(),
}));

vi.mock("node:fs", () => ({ statSync: statSyncMock }));

const baseTypescript = {
  asyncFunctions: 10,
  classes: 5,
  constants: 20,
  decorators: 3,
  enums: 2,
  exported: 15,
  externalPackages: new Set(["react", "lodash", "zod"]),
  functions: 30,
  genericDeclarations: 4,
  imports: 25,
  interfaces: 8,
  jsFiles: 5,
  lines: 1000,
  methods: 12,
  syncFunctions: 20,
  testFiles: 10,
  todos: 2,
  tsFiles: 40,
};

const basePython = {
  classes: 3,
  constants: 5,
  decorators: 2,
  files: 6,
  functions: 10,
  imports: 8,
  lines: 200,
  protocols: 2,
};

describe(StatisticsService, () => {
  let service: StatisticsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [StatisticsService],
    }).compile();
    service = await module.resolve(StatisticsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    statSyncMock.mockReturnValue({ size: 1024 });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("combines typescript and python line counts", () => {
    const result = service.compute({
      python: basePython,
      trackedFiles: [],
      typescript: baseTypescript,
      workingDirectory: "/repo",
    });

    expect(result.lines).toBe(1200);
  });

  it("combines typescript and python file counts", () => {
    const result = service.compute({
      python: basePython,
      trackedFiles: [],
      typescript: baseTypescript,
      workingDirectory: "/repo",
    });

    expect(result.sourceFiles).toBe(51); // tsFiles(40) + jsFiles(5) + py.files(6)
    expect(result.tsFiles).toBe(40);
    expect(result.jsFiles).toBe(5);
    expect(result.pyFiles).toBe(6);
  });

  it("combines classes and functions from both languages", () => {
    const result = service.compute({
      python: basePython,
      trackedFiles: [],
      typescript: baseTypescript,
      workingDirectory: "/repo",
    });

    expect(result.classes).toBe(8); // 5 + 3
    expect(result.functions).toBe(52); // ts.functions(30) + ts.methods(12) + py.functions(10)
  });

  it("computes interfaces as ts.interfaces + py.protocols", () => {
    const result = service.compute({
      python: basePython,
      trackedFiles: [],
      typescript: baseTypescript,
      workingDirectory: "/repo",
    });

    expect(result.interfaces).toBe(10); // 8 + 2
  });

  it("computes repo size from tracked file sizes", () => {
    statSyncMock.mockReturnValue({ size: 1024 * 1024 }); // 1 MiB each

    const result = service.compute({
      python: EMPTY_PYTHON_RESULT,
      trackedFiles: ["a.ts", "b.ts"],
      typescript: { ...baseTypescript },
      workingDirectory: "/repo",
    });

    expect(result.repoSizeMiB).toBe("2.0");
  });

  it("counts unique folders from tracked file paths", () => {
    const result = service.compute({
      python: EMPTY_PYTHON_RESULT,
      trackedFiles: [
        "src/modules/foo/foo.ts",
        "src/modules/foo/foo.test.ts",
        "src/modules/bar/bar.ts",
      ],
      typescript: { ...baseTypescript },
      workingDirectory: "/repo",
    });

    // Unique folders: "src", "src/modules", "src/modules/foo", "src/modules/bar"
    expect(result.folders).toBe(4);
  });
});
```

- [ ] **Step 4: Run the tests and verify they fail**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=statistics
```

Expected: FAIL — service has no `compute` method.

- [ ] **Step 5: Implement the service**

Replace `packages/metitur/src/modules/statistics/statistics.service.ts`:

```ts
import { statSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { CodeStatistics, StatisticsInput } from "./statistics.types.js";

/** Aggregates per-language analysis results into a single `CodeStatistics` object. */
@Injectable()
export class StatisticsService {
  // 🌎 Public Methods

  /** Combines TypeScript, JavaScript, and Python analysis results with repo metadata. */
  compute(input: StatisticsInput): CodeStatistics {
    const { python, trackedFiles, typescript, workingDirectory } = input;

    let repoBytes = 0;
    for (const filePath of trackedFiles) {
      try {
        repoBytes += statSync(path.resolve(workingDirectory, filePath)).size;
      } catch {
        // ignore missing files
      }
    }

    const trackedFolders = new Set<string>();
    for (const filePath of trackedFiles) {
      const parts = filePath.split("/");
      for (let index = 1; index < parts.length; index++) {
        trackedFolders.add(parts.slice(0, index).join("/"));
      }
    }

    return {
      asyncFunctions: typescript.asyncFunctions,
      classes: typescript.classes + python.classes,
      constants: typescript.constants + python.constants,
      decorators: typescript.decorators + python.decorators,
      enums: typescript.enums,
      exportedSymbols: typescript.exported,
      externalPackages: typescript.externalPackages.size,
      folders: trackedFolders.size,
      functions: typescript.functions + typescript.methods + python.functions,
      genericDeclarations: typescript.genericDeclarations,
      imports: typescript.imports + python.imports,
      interfaces: typescript.interfaces + python.protocols,
      jsFiles: typescript.jsFiles,
      lines: typescript.lines + python.lines,
      pyFiles: python.files,
      repoSizeMiB: (repoBytes / 1024 / 1024).toFixed(1),
      sourceFiles: typescript.tsFiles + typescript.jsFiles + python.files,
      syncFunctions: typescript.syncFunctions,
      testFiles: typescript.testFiles,
      todos: typescript.todos,
      tsFiles: typescript.tsFiles,
    };
  }
}
```

- [ ] **Step 6: Run the tests and verify they pass**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=statistics
```

Expected: all tests pass.

- [ ] **Step 7: Run analyze-code and commit**

```bash
pnpm exec nx run metitur:analyze-code --configuration=write
pnpm exec nx run metitur:analyze-code --configuration=check
git add packages/metitur/src/modules/statistics/
git commit -m "feat(metitur): ✨ add statistics module"
```

---

## Task 6: `readme-badges` module

**Files:**
- Create: `packages/metitur/src/modules/readme-badges/readme-badges.service.ts`
- Create: `packages/metitur/src/modules/readme-badges/readme-badges.service.unit.test.ts`
- Create: `packages/metitur/src/modules/readme-badges/readme-badges.module.ts`

**Interfaces:**
- Consumes: `CodeStatistics` (Task 5)
- Produces:
  ```ts
  render(statistics: CodeStatistics): string
  write(readmePath: string, statistics: CodeStatistics): void
  check(readmePath: string, statistics: CodeStatistics): void  // throws on mismatch
  ```

- [ ] **Step 1: Generate the service module**

```bash
pnpm exec nx g conformance:nestjs-service-module --name=readme-badges --project=metitur
```

Delete the generated `readme-badges.constants.ts` and `readme-badges.types.ts` if they are empty — this module has no constants or types of its own (it consumes `CodeStatistics`).

- [ ] **Step 2: Write the failing tests**

Replace `packages/metitur/src/modules/readme-badges/readme-badges.service.unit.test.ts`:

```ts
import * as fs from "node:fs";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { CodeStatistics } from "../statistics/statistics.types.js";
import { ReadmeBadgesService } from "./readme-badges.service.js";

const { readFileSyncMock, writeFileSyncMock } = vi.hoisted(() => ({
  readFileSyncMock: vi.fn<(filePath: string, encoding: string) => string>(),
  writeFileSyncMock: vi.fn<
    (filePath: string, content: string, encoding: string) => void
  >(),
}));

vi.mock("node:fs", () => ({
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}));

const sampleStatistics: CodeStatistics = {
  asyncFunctions: 50,
  classes: 8,
  constants: 25,
  decorators: 5,
  enums: 2,
  exportedSymbols: 80,
  externalPackages: 15,
  folders: 30,
  functions: 42,
  genericDeclarations: 10,
  imports: 60,
  interfaces: 10,
  jsFiles: 5,
  lines: 1200,
  pyFiles: 6,
  repoSizeMiB: "2.5",
  sourceFiles: 51,
  syncFunctions: 40,
  testFiles: 12,
  todos: 3,
  tsFiles: 40,
};

describe(ReadmeBadgesService, () => {
  let service: ReadmeBadgesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ReadmeBadgesService],
    }).compile();
    service = await module.resolve(ReadmeBadgesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("render", () => {
    it("wraps badges in CODE_STATISTICS markers", () => {
      const result = service.render(sampleStatistics);

      expect(result).toMatch(/^<!-- CODE_STATISTICS_START -->/);
      expect(result).toMatch(/<!-- CODE_STATISTICS_END -->$/);
    });

    it("includes a Lines of Code badge with correct value", () => {
      const result = service.render(sampleStatistics);

      expect(result).toContain("Lines_of_Code-1200-22c55e");
    });

    it("includes a Repo Size badge", () => {
      const result = service.render(sampleStatistics);

      expect(result).toContain("Repo_Size-2.5_MiB-6b7280");
    });

    it("encodes dashes and underscores in badge values", () => {
      const statsWithDash = { ...sampleStatistics, repoSizeMiB: "1-5" };
      const result = service.render(statsWithDash);

      expect(result).toContain("1--5");
    });
  });

  describe("write", () => {
    it("replaces the existing badge block in the README", () => {
      const existingReadme =
        "# Title\n<!-- CODE_STATISTICS_START -->\nold\n<!-- CODE_STATISTICS_END -->\n## More";
      readFileSyncMock.mockReturnValue(existingReadme);

      service.write("/repo/README.md", sampleStatistics);

      const [, content] = writeFileSyncMock.mock.calls[0] ?? [];
      expect(content).toContain("<!-- CODE_STATISTICS_START -->");
      expect(content).toContain("Lines_of_Code-1200");
      expect(content).not.toContain("old");
    });

    it("throws when the README is missing the CODE_STATISTICS_START marker", () => {
      readFileSyncMock.mockReturnValue("# No markers here");

      expect(() => service.write("/repo/README.md", sampleStatistics)).toThrow(
        "missing <!-- CODE_STATISTICS_START -->",
      );
    });
  });

  describe("check", () => {
    it("does not throw when the badge block is up to date", () => {
      const block = service.render(sampleStatistics);
      readFileSyncMock.mockReturnValue(
        `# Title\n${block}\n## More`,
      );

      expect(() =>
        service.check("/repo/README.md", sampleStatistics),
      ).not.toThrow();
    });

    it("throws with a stale message when the badge block differs", () => {
      readFileSyncMock.mockReturnValue(
        "# Title\n<!-- CODE_STATISTICS_START -->\nstale content\n<!-- CODE_STATISTICS_END -->",
      );

      expect(() =>
        service.check("/repo/README.md", sampleStatistics),
      ).toThrow("README code stats are stale");
    });
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=readme-badges
```

Expected: FAIL — `ReadmeBadgesService` has no `render`, `write`, or `check` methods.

- [ ] **Step 4: Implement the service**

Replace `packages/metitur/src/modules/readme-badges/readme-badges.service.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";

import type { CodeStatistics } from "../statistics/statistics.types.js";

const BLOCK_START = "<!-- CODE_STATISTICS_START -->";
const BLOCK_END = "<!-- CODE_STATISTICS_END -->";
const BLOCK_REGEX = /<!-- CODE_STATISTICS_START -->[\s\S]*?<!-- CODE_STATISTICS_END -->/;

/** Renders and manages the shields.io badge block in a codebase README. */
@Injectable()
export class ReadmeBadgesService {
  // 🔏 Private Methods

  private encode(value: number | string): string {
    return String(value)
      .replaceAll("-", "--")
      .replaceAll("_", "__")
      .replaceAll(" ", "_");
  }

  private badge(
    label: string,
    value: number | string,
    color: string,
  ): string {
    return `![${label}](https://img.shields.io/badge/${this.encode(label)}-${this.encode(value)}-${color}?style=flat-square)`;
  }

  // 🌎 Public Methods

  /** Renders `statistics` as a shields.io badge block string. */
  render(statistics: CodeStatistics): string {
    const badges = [
      this.badge("Lines of Code", statistics.lines, "22c55e"),
      this.badge("Repo Size", `${statistics.repoSizeMiB} MiB`, "6b7280"),
      this.badge("Folders", statistics.folders, "4a4a4a"),
      this.badge("Source Files", statistics.sourceFiles, "3178c6"),
      this.badge("Test Files", statistics.testFiles, "10b981"),
      this.badge("External Packages", statistics.externalPackages, "8b5cf6"),
      this.badge("Classes", statistics.classes, "7c3aed"),
      this.badge("Functions", statistics.functions, "16a34a"),
      this.badge("Sync Functions", statistics.syncFunctions, "4ade80"),
      this.badge("Async Functions", statistics.asyncFunctions, "059669"),
      this.badge("Interfaces", statistics.interfaces, "0ea5e9"),
      this.badge("Generic Declarations", statistics.genericDeclarations, "0369a1"),
      this.badge("Enums", statistics.enums, "f97316"),
      this.badge("Constants", statistics.constants, "dc2626"),
      this.badge("Imports", statistics.imports, "0284c7"),
      this.badge("Decorators", statistics.decorators, "db2777"),
      this.badge("Exported Symbols", statistics.exportedSymbols, "ea580c"),
      this.badge("TODO Comments", statistics.todos, "ca8a04"),
    ].join("\n");

    return `${BLOCK_START}\n${badges}\n${BLOCK_END}`;
  }

  /** Writes the rendered badge block into the README at `readmePath`. */
  write(readmePath: string, statistics: CodeStatistics): void {
    const readme = readFileSync(readmePath, "utf8");

    if (!readme.includes(BLOCK_START)) {
      throw new Error(
        `README at ${readmePath} is missing <!-- CODE_STATISTICS_START --> marker`,
      );
    }

    const updated = readme.replace(BLOCK_REGEX, this.render(statistics));
    writeFileSync(readmePath, updated, "utf8");
  }

  /** Throws an error with a descriptive message if the README badge block is stale. */
  check(readmePath: string, statistics: CodeStatistics): void {
    const readme = readFileSync(readmePath, "utf8");
    const current = BLOCK_REGEX.exec(readme)?.[0];
    const expected = this.render(statistics);

    if (current === expected) {
      return;
    }

    throw new Error(
      `README code stats are stale.\n` +
        `Run \`nx run codebase:codometer:write\` locally and commit the result.`,
    );
  }
}
```

- [ ] **Step 5: Run the tests and verify they pass**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=readme-badges
```

Expected: all tests pass.

- [ ] **Step 6: Run analyze-code and commit**

```bash
pnpm exec nx run metitur:analyze-code --configuration=write
pnpm exec nx run metitur:analyze-code --configuration=check
git add packages/metitur/src/modules/readme-badges/
git commit -m "feat(metitur): ✨ add readme-badges module"
```

---

## Task 7: `measure` command + wire `main.module.ts`

**Files:**
- Create: `packages/metitur/src/modules/measure/measure.types.ts`
- Create: `packages/metitur/src/modules/measure/measure.command.ts`
- Create: `packages/metitur/src/modules/measure/measure.command.unit.test.ts`
- Create: `packages/metitur/src/modules/measure/measure.module.ts`
- Modify: `packages/metitur/src/main.module.ts`

**Interfaces:**
- Consumes: `FileDiscoveryService` (Task 2), `TypescriptAnalysisService` (Task 3), `PythonAnalysisService` (Task 4), `StatisticsService` (Task 5), `ReadmeBadgesService` (Task 6)

- [ ] **Step 1: Generate the command module**

```bash
pnpm exec nx g conformance:nestjs-command-module --name=measure --project=metitur
```

- [ ] **Step 2: Write the types**

Replace `packages/metitur/src/modules/measure/measure.types.ts`:

```ts
/** Options parsed from the `measure` CLI command. */
export interface MeasureCommandOptions {
  check?: boolean;
  directory?: string;
  readme?: string;
}
```

- [ ] **Step 3: Write the failing test**

Replace `packages/metitur/src/modules/measure/measure.command.unit.test.ts`:

```ts
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "../logger/logger.service.js";
import { FileDiscoveryService } from "../file-discovery/file-discovery.service.js";
import { TypescriptAnalysisService } from "../typescript-analysis/typescript-analysis.service.js";
import { PythonAnalysisService } from "../python-analysis/python-analysis.service.js";
import { StatisticsService } from "../statistics/statistics.service.js";
import { ReadmeBadgesService } from "../readme-badges/readme-badges.service.js";
import { MeasureCommand } from "./measure.command.js";

describe(MeasureCommand, () => {
  let command: MeasureCommand;
  let fileDiscovery: FileDiscoveryService;
  let typescriptAnalysis: TypescriptAnalysisService;
  let pythonAnalysis: PythonAnalysisService;
  let statistics: StatisticsService;
  let readmeBadges: ReadmeBadgesService;

  const mockFiles = {
    jsFiles: [],
    pyFiles: [],
    sourceFiles: [],
    testFiles: [],
    trackedFiles: ["src/main.ts"],
    tsFiles: ["src/main.ts"],
  };

  const mockTypescriptResult = {
    asyncFunctions: 0,
    classes: 1,
    constants: 0,
    decorators: 0,
    enums: 0,
    exported: 1,
    externalPackages: new Set<string>(),
    functions: 1,
    genericDeclarations: 0,
    imports: 1,
    interfaces: 0,
    jsFiles: 0,
    lines: 10,
    methods: 0,
    syncFunctions: 1,
    testFiles: 0,
    todos: 0,
    tsFiles: 1,
  };

  const mockStats = {
    asyncFunctions: 0,
    classes: 1,
    constants: 0,
    decorators: 0,
    enums: 0,
    exportedSymbols: 1,
    externalPackages: 0,
    folders: 1,
    functions: 1,
    genericDeclarations: 0,
    imports: 1,
    interfaces: 0,
    jsFiles: 0,
    lines: 10,
    pyFiles: 0,
    repoSizeMiB: "0.0",
    sourceFiles: 1,
    syncFunctions: 1,
    testFiles: 0,
    todos: 0,
    tsFiles: 1,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeasureCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: FileDiscoveryService, useValue: createMock<FileDiscoveryService>() },
        { provide: TypescriptAnalysisService, useValue: createMock<TypescriptAnalysisService>() },
        { provide: PythonAnalysisService, useValue: createMock<PythonAnalysisService>() },
        { provide: StatisticsService, useValue: createMock<StatisticsService>() },
        { provide: ReadmeBadgesService, useValue: createMock<ReadmeBadgesService>() },
      ],
    }).compile();

    command = await module.resolve(MeasureCommand);
    fileDiscovery = await module.resolve(FileDiscoveryService);
    typescriptAnalysis = await module.resolve(TypescriptAnalysisService);
    pythonAnalysis = await module.resolve(PythonAnalysisService);
    statistics = await module.resolve(StatisticsService);
    readmeBadges = await module.resolve(ReadmeBadgesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileDiscovery.discoverFiles).mockReturnValue(mockFiles);
    vi.mocked(typescriptAnalysis.analyze).mockReturnValue(mockTypescriptResult);
    vi.mocked(pythonAnalysis.analyze).mockResolvedValue({
      classes: 0, constants: 0, decorators: 0, files: 0,
      functions: 0, imports: 0, lines: 0, protocols: 0,
    });
    vi.mocked(statistics.compute).mockReturnValue(mockStats);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("calls all services in order and writes README when --readme is provided", async () => {
    await command.run([], { directory: "/repo", readme: "README.md" });

    expect(fileDiscovery.discoverFiles).toHaveBeenCalledWith("/repo");
    expect(typescriptAnalysis.analyze).toHaveBeenCalled();
    expect(pythonAnalysis.analyze).toHaveBeenCalledWith("/repo");
    expect(statistics.compute).toHaveBeenCalled();
    expect(readmeBadges.write).toHaveBeenCalledWith(
      expect.stringContaining("README.md"),
      mockStats,
    );
  });

  it("calls check instead of write when --check flag is set", async () => {
    await command.run([], { check: true, directory: "/repo", readme: "README.md" });

    expect(readmeBadges.check).toHaveBeenCalledWith(
      expect.stringContaining("README.md"),
      mockStats,
    );
    expect(readmeBadges.write).not.toHaveBeenCalled();
  });

  it("prints statistics to stdout and skips readme services when --readme is omitted", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await command.run([], { directory: "/repo" });

    expect(readmeBadges.write).not.toHaveBeenCalled();
    expect(readmeBadges.check).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"lines"'),
    );

    consoleSpy.mockRestore();
  });
});
```

- [ ] **Step 4: Run the tests and verify they fail**

```bash
pnpm exec nx run metitur:test:unit --testPathPattern=measure.command
```

Expected: FAIL — `MeasureCommand` does not exist.

- [ ] **Step 5: Implement the command**

Replace `packages/metitur/src/modules/measure/measure.command.ts`:

```ts
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { FileDiscoveryService } from "../file-discovery/file-discovery.service.js";
import { LoggerService } from "../logger/logger.service.js";
import { PythonAnalysisService } from "../python-analysis/python-analysis.service.js";
import { ReadmeBadgesService } from "../readme-badges/readme-badges.service.js";
import { StatisticsService } from "../statistics/statistics.service.js";
import { TypescriptAnalysisService } from "../typescript-analysis/typescript-analysis.service.js";
import type { MeasureCommandOptions } from "./measure.types.js";

/** Measures codebase statistics and optionally writes or checks the README badge block. */
@Command({
  description:
    "Measure codebase statistics. Writes a badge block to README when --readme is provided.",
  name: "measure",
})
@Injectable()
export class MeasureCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly fileDiscovery: FileDiscoveryService,
    private readonly typescriptAnalysis: TypescriptAnalysisService,
    private readonly pythonAnalysis: PythonAnalysisService,
    private readonly statistics: StatisticsService,
    private readonly readmeBadges: ReadmeBadgesService,
  ) {
    super();
    this.logger.setContext(MeasureCommand.name);
  }

  // 🌎 Public Methods

  async run(_: string[], options: MeasureCommandOptions): Promise<void> {
    const workingDirectory = path.resolve(options.directory ?? process.cwd());
    this.logger.log(`Analyzing codebase at ${workingDirectory}`);

    const files = this.fileDiscovery.discoverFiles(workingDirectory);
    this.logger.log(`Discovered ${files.trackedFiles.length} tracked files`);

    const typescript = this.typescriptAnalysis.analyze({
      sourceFiles: files.sourceFiles,
      workingDirectory,
    });

    const python = await this.pythonAnalysis.analyze(workingDirectory);

    const stats = this.statistics.compute({
      python,
      trackedFiles: files.trackedFiles,
      typescript,
      workingDirectory,
    });

    if (options.readme === undefined) {
      console.log(JSON.stringify(stats, null, 2));
      return;
    }

    const readmePath = path.resolve(workingDirectory, options.readme);

    if (options.check === true) {
      this.readmeBadges.check(readmePath, stats);
      this.logger.log("✅ README code stats are up to date.");
    } else {
      this.readmeBadges.write(readmePath, stats);
      this.logger.log("✅ README.md code stats updated.");
    }
  }

  @Option({
    description: "Compare only — exit 1 if README badge block is stale",
    flags: "--check",
  })
  parseCheck(): boolean {
    return true;
  }

  @Option({
    description: "Target codebase root directory",
    flags: "-d, --directory <path>",
  })
  parseDirectory(value: string): string {
    return value;
  }

  @Option({
    description:
      "README path relative to --directory. When omitted, statistics are printed to stdout.",
    flags: "-r, --readme <path>",
  })
  parseReadme(value: string): string {
    return value;
  }
}
```

- [ ] **Step 6: Wire all modules into `main.module.ts`**

Replace `packages/metitur/src/main.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DiscoveryModule } from "@nestjs/core";

import { environmentSchema } from "./constants.js";
import { FileDiscoveryModule } from "./modules/file-discovery/file-discovery.module.js";
import { LoggerModule } from "./modules/logger/logger.module.js";
import { MeasureModule } from "./modules/measure/measure.module.js";
import { PythonAnalysisModule } from "./modules/python-analysis/python-analysis.module.js";
import { ReadmeBadgesModule } from "./modules/readme-badges/readme-badges.module.js";
import { StatisticsModule } from "./modules/statistics/statistics.module.js";
import { TypescriptAnalysisModule } from "./modules/typescript-analysis/typescript-analysis.module.js";

/**
 * Root NestJS application module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      validate: (config: Record<string, unknown>) =>
        environmentSchema.parse(config),
    }),
    DiscoveryModule,
    FileDiscoveryModule,
    LoggerModule,
    MeasureModule,
    PythonAnalysisModule,
    ReadmeBadgesModule,
    StatisticsModule,
    TypescriptAnalysisModule,
  ],
})
export class MainModule {}
```

Each `XxxModule` must list `XxxService` in both `providers` and `exports`. Update any generated modules that only have `providers`. For example, `packages/metitur/src/modules/python-analysis/python-analysis.module.ts` must also import `LoggerModule`:

```ts
import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module.js";
import { PythonAnalysisService } from "./python-analysis.service.js";

@Module({
  exports: [PythonAnalysisService],
  imports: [LoggerModule],
  providers: [PythonAnalysisService],
})
export class PythonAnalysisModule {}
```

The `MeasureModule` must import all five service modules:

```ts
import { Module } from "@nestjs/common";

import { FileDiscoveryModule } from "../file-discovery/file-discovery.module.js";
import { LoggerModule } from "../logger/logger.module.js";
import { PythonAnalysisModule } from "../python-analysis/python-analysis.module.js";
import { ReadmeBadgesModule } from "../readme-badges/readme-badges.module.js";
import { StatisticsModule } from "../statistics/statistics.module.js";
import { TypescriptAnalysisModule } from "../typescript-analysis/typescript-analysis.module.js";
import { MeasureCommand } from "./measure.command.js";

@Module({
  imports: [
    FileDiscoveryModule,
    LoggerModule,
    PythonAnalysisModule,
    ReadmeBadgesModule,
    StatisticsModule,
    TypescriptAnalysisModule,
  ],
  providers: [MeasureCommand],
})
export class MeasureModule {}
```

- [ ] **Step 7: Run the tests and verify they pass**

```bash
pnpm exec nx run metitur:test:unit
```

Expected: all tests pass.

- [ ] **Step 8: Verify typecheck passes**

```bash
pnpm exec nx run metitur:typecheck
```

Expected: no errors.

- [ ] **Step 9: Run analyze-code and commit**

```bash
pnpm exec nx run metitur:analyze-code --configuration=write
pnpm exec nx run metitur:analyze-code --configuration=check
git add packages/metitur/src/modules/measure/ packages/metitur/src/main.module.ts
git commit -m "feat(metitur): ✨ add measure command and wire main module"
```

---

## Task 8: Migration — replace scripts with `metitur`

**Files:**
- Delete: `scripts/codometer.ts`
- Delete: `scripts/codometer.py`
- Modify: `project.json` (workspace root) — `codometer` target

- [ ] **Step 1: Update the root `project.json` `codometer` target**

In the workspace root `project.json`, replace the `codometer` target with:

```json
"codometer": {
  "cache": false,
  "configurations": {
    "check": {
      "command": "pnpm exec nx run metitur:start -- measure --directory={workspaceRoot} --readme=README.md --check"
    },
    "write": {
      "command": "pnpm exec nx run metitur:start -- measure --directory={workspaceRoot} --readme=README.md"
    }
  },
  "defaultConfiguration": "write",
  "description": "Analyze codebase and write README.md statistics badges",
  "executor": "nx:run-commands",
  "options": {
    "cwd": "{workspaceRoot}"
  },
  "outputs": [
    "{workspaceRoot}/README.md"
  ]
}
```

- [ ] **Step 2: Verify the write target runs successfully**

```bash
pnpm exec nx run codebase:codometer:write
```

Expected: exits 0, README.md badge block is updated.

- [ ] **Step 3: Verify the check target passes after writing**

```bash
pnpm exec nx run codebase:codometer:check
```

Expected: exits 0 with "✅ README code stats are up to date."

- [ ] **Step 4: Delete the old scripts**

```bash
git rm scripts/codometer.ts scripts/codometer.py
```

- [ ] **Step 5: Verify no remaining references to the old scripts**

```bash
git grep "scripts/codometer" -- '*.json' '*.ts' '*.yml' '*.yaml'
```

Expected: no matches (the only reference was in `project.json` which was updated in Step 1).

- [ ] **Step 6: Run the full analyze-code check across affected projects**

```bash
pnpm exec nx affected --target=analyze-code --configuration=check --base=main
```

Expected: all checks pass.

- [ ] **Step 7: Commit**

```bash
git add project.json scripts/
git commit -m "refactor(metitur): ♻️ migrate codometer scripts to metitur package"
```
